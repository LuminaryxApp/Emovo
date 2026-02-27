export type VerificationTier = "none" | "verified" | "official";

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  username: string | null;
  showRealName: boolean;
  bio: string | null;
  isPrivate: boolean;
  timezone: string;
  notificationsEnabled: boolean;
  preferredLanguage: string;
  avatarBase64: string | null;
  reminderTime: string | null;
  themePreference: string;
  isAdmin: boolean;
  verificationTier: VerificationTier;
  bannedAt: string | null;
  suspendedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  displayName?: string;
  username?: string | null;
  showRealName?: boolean;
  bio?: string | null;
  isPrivate?: boolean;
  timezone?: string;
  notificationsEnabled?: boolean;
  email?: string;
  preferredLanguage?: string;
  avatarBase64?: string | null;
  reminderTime?: string | null;
  themePreference?: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  username: string | null;
  showRealName: boolean;
  avatarBase64: string | null;
  bio: string | null;
  isPrivate: boolean;
  verificationTier: VerificationTier;
  followerCount: number;
  followingCount: number;
  followStatus: "none" | "following" | "pending" | "self";
  createdAt: string;
}

export interface FollowListItem {
  id: string;
  displayName: string;
  username: string | null;
  showRealName: boolean;
  avatarBase64: string | null;
  verificationTier: VerificationTier;
  isFollowing: boolean;
}

export interface FollowRequest {
  id: string;
  user: FollowListItem;
  createdAt: string;
}
