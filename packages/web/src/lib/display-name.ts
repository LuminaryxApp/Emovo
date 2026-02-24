/**
 * Resolves the public display name for a user, respecting the showRealName setting.
 * If showRealName is false and the user has a username, shows @username instead.
 */
export function getPublicName(author: {
  displayName: string;
  username?: string | null;
  showRealName?: boolean;
}): string {
  if (author.username && !author.showRealName) {
    return `@${author.username}`;
  }
  return author.displayName;
}
