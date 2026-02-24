"use client";

import type { Notification } from "@emovo/shared";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { listNotificationsApi, markNotificationReadApi } from "@/services/notification.api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNotificationsApi({ limit: 50 })
      .then((r) => setNotifications(r.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} />}
          title="No notifications yet"
          description="When someone likes or comments on your posts, you'll see it here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "cursor-pointer p-4 transition-colors hover:bg-surface-elevated",
                !n.readAt && "border-l-4 border-l-brand-green",
              )}
              onClick={() => !n.readAt && handleRead(n.id)}
            >
              <p
                className={cn(
                  "text-sm",
                  n.readAt ? "text-text-secondary" : "font-semibold text-text-primary",
                )}
              >
                {(n as { message?: string }).message ||
                  (n as { body?: string }).body ||
                  "New notification"}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
