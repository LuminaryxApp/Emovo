import type { ErrorCode } from "../constants/error-codes.js";

export interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;
    total?: number;
  };
}

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown[];
    requestId: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: import("./user.js").User;
  accessToken: string;
  refreshToken: string;
}

export interface Session {
  id: string;
  deviceName: string | null;
  lastUsedAt: string;
  createdAt: string;
  current: boolean;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
}

export type StatsPeriod = "week" | "month" | "year";
