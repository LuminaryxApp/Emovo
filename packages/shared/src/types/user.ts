export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  timezone: string;
  notificationsEnabled: boolean;
  preferredLanguage: string;
  avatarBase64: string | null;
  reminderTime: string | null;
  themePreference: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  displayName?: string;
  timezone?: string;
  notificationsEnabled?: boolean;
  email?: string;
  preferredLanguage?: string;
  avatarBase64?: string | null;
  reminderTime?: string | null;
  themePreference?: string;
}
