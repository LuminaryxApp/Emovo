import type { AuthResponse } from "@emovo/shared";

import { api } from "./api";

export async function registerApi(
  email: string,
  password: string,
  displayName: string,
  preferredLanguage?: string,
) {
  const { data } = await api.post("/auth/register", {
    email,
    password,
    displayName,
    preferredLanguage,
  });
  return data.data as { message: string };
}

export async function verifyEmailApi(token: string) {
  const { data } = await api.post("/auth/verify-email", { token });
  return data.data as AuthResponse;
}

export async function loginApi(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  return data.data as AuthResponse;
}

export async function logoutApi(refreshToken: string) {
  await api.post("/auth/logout", { refreshToken });
}

export async function logoutAllApi() {
  await api.post("/auth/logout-all");
}

export async function forgotPasswordApi(email: string) {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data.data as { message: string };
}

export async function resetPasswordApi(token: string, newPassword: string) {
  await api.post("/auth/reset-password", { token, newPassword });
}

export async function resendVerificationApi(email: string) {
  const { data } = await api.post("/auth/resend-verification", { email });
  return data.data as { message: string };
}
