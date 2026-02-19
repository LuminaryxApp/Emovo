import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { getAccessToken } from "./api";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export async function exportData(format: "json" | "csv"): Promise<void> {
  const token = getAccessToken();
  const date = new Date().toISOString().split("T")[0];
  const ext = format === "json" ? "json" : "csv";
  const filename = `emovo-export-${date}.${ext}`;

  const response = await fetch(`${API_URL}/export/${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }

  const text = await response.text();
  const file = new File(Paths.cache, filename);
  file.write(text);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: format === "json" ? "application/json" : "text/csv",
    });
  }
}
