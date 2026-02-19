export interface CursorData {
  loggedAt: string;
  id: string;
}

export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as CursorData;
    if (!parsed.loggedAt || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}
