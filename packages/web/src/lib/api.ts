import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// In-memory access token
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// localStorage helpers for refresh token
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("emovo_refresh_token");
}

export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("emovo_refresh_token", token);
}

export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("emovo_refresh_token");
}

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Refresh mutex — ensures only ONE refresh call at a time
let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((sub) => sub.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(err: unknown) {
  refreshSubscribers.forEach((sub) => sub.reject(err));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only handle 401 for authenticated requests (not auth endpoints)
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue this request — wait for the ongoing refresh
      return new Promise((resolve, reject) => {
        refreshSubscribers.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const storedRefreshToken = getRefreshToken();
      if (!storedRefreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken: storedRefreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);

      onRefreshed(newAccessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      onRefreshFailed(refreshError);
      setAccessToken(null);
      clearAuthStorage();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
