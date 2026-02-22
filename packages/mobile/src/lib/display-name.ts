/**
 * Returns the public display name for a user based on their privacy settings.
 *
 * Rules:
 * - If the user has a username AND showRealName is false → show @username
 * - If the user has a username AND showRealName is true → show displayName
 * - If the user has no username → show displayName
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
