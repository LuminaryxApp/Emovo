/**
 * Resolves the public display name for a user, respecting the showRealName setting.
 * If showRealName is false and the user has a username, shows @username instead.
 */
export function getPublicName(user: {
  displayName: string;
  username?: string | null;
  showRealName?: boolean;
}): string {
  if (user.username && !user.showRealName) {
    return `@${user.username}`;
  }
  return user.displayName;
}
