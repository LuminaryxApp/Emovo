export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  username: string | null;
  showRealName: boolean;
  timezone: string;
  notificationsEnabled: boolean;
  preferredLanguage: string;
  avatarBase64: string | null;
  reminderTime: string | null;
  themePreference: string;
  isAdmin: boolean;
  bannedAt: string | null;
  suspendedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  displayName?: string;
  username?: string | null;
  showRealName?: boolean;
  timezone?: string;
  notificationsEnabled?: boolean;
  email?: string;
  preferredLanguage?: string;
  avatarBase64?: string | null;
  reminderTime?: string | null;
  themePreference?: string;
}
