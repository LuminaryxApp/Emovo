import type { User, UserProfile } from "@emovo/shared";
import { create } from "zustand";

import { getOrCreateDeviceId, getDeviceName } from "../lib/device-id";
import { getRefreshToken, setRefreshToken, clearAuthStorage } from "../lib/secure-storage";
import { api, setAccessToken } from "../services/api";
import { loginApi, registerApi, logoutApi, logoutAllApi } from "../services/auth.api";
import { updateProfileApi, deleteAccountApi } from "../services/user.api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<string>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateProfile: (updates: UserProfile) => Promise<void>;
  deleteAccount: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // Set device headers
      const deviceId = await getOrCreateDeviceId();
      api.defaults.headers.common["X-Device-Id"] = deviceId;
      api.defaults.headers.common["X-Device-Name"] = getDeviceName();

      const result = await loginApi(email, password);
      setAccessToken(result.accessToken);
      await setRefreshToken(result.refreshToken);

      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || "Login failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await registerApi(email, password, displayName);
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
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    } catch {
      // Ignore logout errors — still clear local state
    } finally {
      setAccessToken(null);
      await clearAuthStorage();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  logoutAll: async () => {
    try {
      await logoutAllApi();
    } catch {
      // Ignore errors
    } finally {
      setAccessToken(null);
      await clearAuthStorage();
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
    await clearAuthStorage();
    set({ user: null, isAuthenticated: false, error: null });
  },

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Try to refresh the session
      const response = await api.post("/auth/refresh", { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      setAccessToken(accessToken);
      await setRefreshToken(newRefreshToken);

      // Fetch user profile
      const profileResponse = await api.get("/users/me");
      const user = profileResponse.data.data as User;

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // Refresh failed — clear everything
      setAccessToken(null);
      await clearAuthStorage();
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  clearError: () => set({ error: null }),
  setUser: (user: User) => set({ user }),
}));
