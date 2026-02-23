# Public Profiles + Follow System

## Summary

Users can view other people's profiles and follow them. Accounts can be public (instant follow) or private (follow requests require approval). Follow counts are server-computed and tamper-proof.

## Database

### New table: `follows`

| Column       | Type        | Constraints                                 |
| ------------ | ----------- | ------------------------------------------- |
| id           | uuid        | PK, default random                          |
| follower_id  | uuid        | NOT NULL, FK -> users(id) ON DELETE CASCADE |
| following_id | uuid        | NOT NULL, FK -> users(id) ON DELETE CASCADE |
| status       | varchar(10) | NOT NULL, CHECK IN ('accepted', 'pending')  |
| created_at   | timestamptz | NOT NULL, default now()                     |

**Constraints:**

- UNIQUE(follower_id, following_id) — prevents duplicate follows
- CHECK(follower_id != following_id) — prevents self-follow
- INDEX on follower_id (for "who am I following?" queries)
- INDEX on following_id (for "who follows me?" queries)
- INDEX on (following_id, status) WHERE status = 'pending' (for pending requests)

### Users table additions

| Column     | Type         | Default |
| ---------- | ------------ | ------- |
| is_private | boolean      | false   |
| bio        | varchar(160) | null    |

## Anti-Gaming Protections

- **No client-writable count fields.** Follower/following counts are always `COUNT(*)` from the `follows` table WHERE `status = 'accepted'`.
- **Self-follow blocked** at database level via CHECK constraint and server validation.
- **Unique constraint** prevents duplicate follow rows.
- **Server-only state transitions** — only the server sets `status = accepted`. Clients cannot bypass pending.
- **Rate limiting** on follow/unfollow endpoints (10 per minute) to prevent spam toggling.

## Server API

### Public profile

- `GET /users/:id` — Returns: displayName or @username (respecting showRealName), avatarBase64, bio, isPrivate, createdAt, followerCount, followingCount, followStatus ('none' | 'following' | 'pending' | 'self')

### Follow actions

- `POST /users/:id/follow` — Follow or send request. Returns { status: 'accepted' | 'pending' }
- `DELETE /users/:id/follow` — Unfollow or cancel pending request

### Follower/following lists

- `GET /users/:id/followers` — Paginated list (cursor-based). Each item: id, displayName, username, showRealName, avatarBase64, isFollowing (viewer's relation)
- `GET /users/:id/following` — Same shape as followers

### Follow requests (for private accounts)

- `GET /users/me/follow-requests` — Pending incoming requests (paginated)
- `POST /users/me/follow-requests/:id/accept` — Accept request (sets status to 'accepted')
- `DELETE /users/me/follow-requests/:id` — Decline request (deletes row)

## Mobile Screens

### New: `app/profile/[id].tsx`

Minimal public profile screen:

- Large avatar (2xl)
- Display name / @username
- Bio (if present)
- "Member since" date
- Follower count | Following count (tappable)
- Follow / Unfollow / Requested button
- If viewing own profile, redirect to profile tab

### New: `app/profile/[id]/followers.tsx` and `following.tsx`

- Scrollable user list with avatar, name, follow/unfollow button per row

### Updated: Privacy setting in profile

- Toggle for "Private account" in account settings
- Description: "When enabled, people must request to follow you"

### Updated: Follow requests screen

- Accessible from profile tab when user has pending requests
- Shows badge count for pending requests
- Accept / Decline buttons per request

## Tap Entry Points

Make author names/avatars navigate to `router.push(/profile/${userId})`:

- Community feed: post author row (avatar + name)
- Post detail: post author row + comment author names
- Messages tab: conversation list items
- Online now: avatar circles

## Privacy Logic

- **Public account** (default): `POST /users/:id/follow` immediately sets `status = 'accepted'`
- **Private account**: `POST /users/:id/follow` sets `status = 'pending'`. Target user accepts/declines from requests screen.
- Private accounts still show name, avatar, bio, member since, and follower/following counts publicly.

## Shared Types

```typescript
interface PublicProfile {
  id: string;
  displayName: string;
  username: string | null;
  showRealName: boolean;
  avatarBase64: string | null;
  bio: string | null;
  isPrivate: boolean;
  followerCount: number;
  followingCount: number;
  followStatus: "none" | "following" | "pending" | "self";
  createdAt: string;
}

interface FollowListItem {
  id: string;
  displayName: string;
  username: string | null;
  showRealName: boolean;
  avatarBase64: string | null;
  isFollowing: boolean;
}
```

## Migration

Single migration:

1. Create `follows` table with all constraints and indexes
2. Add `is_private` boolean to users (default false)
3. Add `bio` varchar(160) to users (nullable)
