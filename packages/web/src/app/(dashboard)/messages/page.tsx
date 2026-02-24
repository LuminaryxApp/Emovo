"use client";

import type { ConversationPreview } from "@emovo/shared";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { listConversationsApi } from "@/services/community.api";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listConversationsApi({ limit: 50 })
      .then((r) => setConversations(r.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Messages</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={40} />}
          title="No messages yet"
          description="Start a conversation from someone's profile."
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link key={conv.id} href={`/messages/${conv.id}`}>
              <Card
                className={cn(
                  "flex items-center gap-3 p-4 transition-colors hover:bg-surface-elevated",
                  conv.unreadCount > 0 && "border-brand-green/30",
                )}
              >
                <Avatar name={conv.name || "Chat"} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {conv.name || "Conversation"}
                    </p>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-text-tertiary">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-xs text-text-secondary truncate">{conv.lastMessage}</p>
                  )}
                </div>
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-green px-1 text-xs font-bold text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
