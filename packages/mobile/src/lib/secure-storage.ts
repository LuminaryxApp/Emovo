import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "emovo_refresh_token";
const SESSION_ID_KEY = "emovo_session_id";
const DEVICE_ID_KEY = "emovo_device_id";

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getSessionId(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_ID_KEY);
}

export async function setSessionId(id: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_ID_KEY, id);
}

export async function getDeviceId(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_ID_KEY);
}

export async function setDeviceId(id: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
}

export async function clearAuthStorage(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(SESSION_ID_KEY);
}
