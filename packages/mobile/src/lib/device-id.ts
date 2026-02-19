import { Platform } from "react-native";

import { getDeviceId, setDeviceId } from "./secure-storage";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedDeviceId: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const existing = await getDeviceId();
  if (existing) {
    cachedDeviceId = existing;
    return existing;
  }

  const newId = generateUUID();
  await setDeviceId(newId);
  cachedDeviceId = newId;
  return newId;
}

export function getDeviceName(): string {
  return `${Platform.OS} ${Platform.Version}`;
}
