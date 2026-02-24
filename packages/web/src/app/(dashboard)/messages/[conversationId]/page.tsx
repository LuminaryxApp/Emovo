"use client";

import type { Message } from "@emovo/shared";
import { format } from "date-fns";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { listMessagesApi, sendMessageApi, markConversationReadApi } from "@/services/community.api";
import { useAuthStore } from "@/stores/auth.store";

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await listMessagesApi(conversationId, { limit: 50 });
        setMessages(result.messages.reverse());
        await markConversationReadApi(conversationId);
      } catch {
        // Error
      } finally {
        setLoading(false);
      }
    }
    load();

    // Poll for new messages
    const interval = setInterval(async () => {
      try {
        const result = await listMessagesApi(conversationId, { limit: 50 });
        setMessages(result.messages.reverse());
      } catch {
        // Ignore
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessageApi(conversationId, { content: text.trim() });
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch {
      // Error
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <Link
        href="/messages"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand-green"
      >
        <ArrowLeft size={16} />
        Back to Messages
      </Link>

      <Card className="flex flex-1 flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-3/4" />
              ))}
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === userId;
              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      isMine
                        ? "bg-brand-green text-white"
                        : "bg-surface-elevated text-text-primary",
                    )}
                  >
                    {!isMine && (
                      <p className="text-xs font-semibold opacity-70">{msg.senderName}</p>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        isMine ? "text-white/60" : "text-text-tertiary",
                      )}
                    >
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t border-border-light p-4">
          <Input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} loading={sending} disabled={!text.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
