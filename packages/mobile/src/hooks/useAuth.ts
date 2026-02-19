import { router } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

import { useAuthStore } from "../stores/auth.store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const logoutAll = useAuthStore((s) => s.logoutAll);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  }, [logout]);

  const handleLogoutAll = useCallback(async () => {
    try {
      await logoutAll();
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  }, [logoutAll]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    clearError,
    login,
    register,
    logout: handleLogout,
    logoutAll: handleLogoutAll,
    updateProfile,
    deleteAccount,
  };
}
