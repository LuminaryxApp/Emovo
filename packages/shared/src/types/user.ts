export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  timezone: string;
  notificationsEnabled: boolean;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  displayName?: string;
  timezone?: string;
  notificationsEnabled?: boolean;
  email?: string;
  preferredLanguage?: string;
}
