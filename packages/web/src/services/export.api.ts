import { getAccessToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export async function exportData(format: "json" | "csv"): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/export/${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split("T")[0];
  const a = document.createElement("a");
  a.href = url;
  a.download = `emovo-export-${date}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
