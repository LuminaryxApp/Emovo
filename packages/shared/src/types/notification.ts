export interface Notification {
  id: string;
  type: "like" | "comment" | "group_invite" | "reminder";
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
