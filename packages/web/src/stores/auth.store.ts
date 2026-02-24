import type { User, UserProfile } from "@emovo/shared";
import { create } from "zustand";

import { api, setAccessToken, getRefreshToken, setRefreshToken, clearAuthStorage } from "@/lib/api";
import { loginApi, registerApi, logoutApi, logoutAllApi } from "@/services/auth.api";
import { updateProfileApi, deleteAccountApi } from "@/services/user.api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    preferredLanguage?: string,
    username?: string,
  ) => Promise<string>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateProfile: (updates: UserProfile) => Promise<void>;
  deleteAccount: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

async function syncTimezone(serverTimezone: string | undefined) {
  try {
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (deviceTz && deviceTz !== serverTimezone) {
      await updateProfileApi({ timezone: deviceTz });
    }
  } catch {
    // Non-critical
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await loginApi(email, password);
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);

      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      syncTimezone(result.user.timezone);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || "Login failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (
    email: string,
    password: string,
    displayName: string,
    preferredLanguage?: string,
    username?: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const result = await registerApi(email, password, displayName, preferredLanguage, username);
      set({ isLoading: false });
      return result.message;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || "Registration failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    } catch {
      // Ignore
    } finally {
      setAccessToken(null);
      clearAuthStorage();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  logoutAll: async () => {
    try {
      await logoutAllApi();
    } catch {
      // Ignore
    } finally {
      setAccessToken(null);
      clearAuthStorage();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  updateProfile: async (updates: UserProfile) => {
    const updated = await updateProfileApi(updates);
    set({ user: updated });
  },

  deleteAccount: async () => {
    await deleteAccountApi();
    setAccessToken(null);
    clearAuthStorage();
    set({ user: null, isAuthenticated: false, error: null });
  },

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const response = await api.post("/auth/refresh", { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      setAccessToken(accessToken);
      setRefreshToken(newRefreshToken);

      const profileResponse = await api.get("/users/me");
      const user = profileResponse.data.data as User;

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      syncTimezone(user.timezone);
    } catch {
      setAccessToken(null);
      clearAuthStorage();
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  clearError: () => set({ error: null }),
  setUser: (user: User) => set({ user }),
}));
