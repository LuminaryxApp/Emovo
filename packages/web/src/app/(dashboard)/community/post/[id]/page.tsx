"use client";

import type { PostWithAuthor, Comment } from "@emovo/shared";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Flag, MessageCircle, MoreHorizontal, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PostCard } from "@/components/community/post-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/cn";
import { getPublicName } from "@/lib/display-name";
import { listCommentsApi, createCommentApi } from "@/services/community.api";
import { listFeedApi } from "@/services/community.api";
import { createReportApi } from "@/services/moderation.api";
import { useAuthStore } from "@/stores/auth.store";

const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Hate speech",
  "Misinformation",
  "Inappropriate content",
  "Other",
];

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  // Report state
  const [reportTarget, setReportTarget] = useState<{ type: "comment"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Comment menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const feed = await listFeedApi({ limit: 50 });
        const found = feed.posts.find((p) => p.id === id);
        if (found) setPost(found);

        const result = await listCommentsApi(id, { limit: 50 });
        setComments(result.comments);
      } catch {
        // Error handled by loading state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const comment = await createCommentApi(id, { content: commentText.trim() });
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    } catch {
      // Error
    } finally {
      setSending(false);
    }
  };

  const handleReport = async () => {
    if (!reportTarget || !reportReason) return;
    setReportSending(true);
    try {
      await createReportApi({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason: reportReason,
        description: reportDescription.trim() || null,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportTarget(null);
        setReportReason("");
        setReportDescription("");
        setReportSuccess(false);
      }, 1500);
    } catch {
      // Error
    } finally {
      setReportSending(false);
    }
  };

  const closeReport = () => {
    setReportTarget(null);
    setReportReason("");
    setReportDescription("");
    setReportSuccess(false);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Back link skeleton */}
        <Skeleton className="h-4 w-36" />

        {/* Post skeleton */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <div className="mt-4 flex gap-4 border-t border-border-light pt-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </Card>

        {/* Comments skeleton */}
        <Card className="p-5">
          <Skeleton className="h-5 w-32 mb-5" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 mb-4">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link
        href="/community"
        className="group inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-brand-green"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        Back to Community
      </Link>

      {/* Post */}
      {post ? (
        <PostCard post={post} />
      ) : (
        <Card className="py-12">
          <EmptyState
            title="Post not found"
            description="This post may have been deleted or is no longer available."
            action={
              <Link href="/community">
                <Button variant="outline">Return to Community</Button>
              </Link>
            }
          />
        </Card>
      )}

      {/* Comments section */}
      <Card className="overflow-hidden p-0">
        {/* Comments header */}
        <div className="flex items-center gap-2 border-b border-border-light px-5 py-4">
          <MessageCircle size={18} className="text-brand-green" />
          <h3 className="text-sm font-bold text-text-primary">
            Comments{" "}
            <span className="ml-1 font-normal text-text-tertiary">({comments.length})</span>
          </h3>
        </div>

        {/* Comments list */}
        <div className="px-5 py-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10">
                <Sparkles size={20} className="text-brand-green" />
              </div>
              <p className="text-sm font-medium text-text-primary">No comments yet</p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                Be the first to share your thoughts
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {comments.map((comment, index) => (
                <div
                  key={comment.id}
                  className={cn(
                    "group relative flex gap-3 rounded-lg py-3 pl-3 pr-2 transition-colors hover:bg-surface-elevated/50",
                    index !== comments.length - 1 && "border-b border-border-light/50",
                  )}
                >
                  {/* Left accent */}
                  <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-brand-green/20 opacity-0 transition-opacity group-hover:opacity-100" />

                  <Link href={`/profile/${comment.userId}`} className="shrink-0">
                    <Avatar
                      name={comment.author ? getPublicName(comment.author) : "User"}
                      size="xs"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/profile/${comment.userId}`}
                        className="truncate text-sm font-semibold text-text-primary hover:text-brand-green transition-colors"
                      >
                        {comment.author ? getPublicName(comment.author) : "User"}
                      </Link>
                      {comment.author?.verificationTier && (
                        <VerifiedBadge tier={comment.author.verificationTier} size={13} />
                      )}
                      <span className="shrink-0 text-xs text-text-tertiary">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
                      {comment.content}
                    </p>
                  </div>

                  {/* Comment actions menu */}
                  {user && user.id !== comment.userId && (
                    <div
                      className="relative shrink-0"
                      ref={openMenuId === comment.id ? menuRef : undefined}
                    >
                      <button
                        onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                        className="rounded-md p-1 text-text-tertiary opacity-0 transition-all hover:bg-surface-elevated hover:text-text-secondary group-hover:opacity-100"
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {openMenuId === comment.id && (
                        <div className="absolute right-0 top-7 z-10 min-w-[160px] overflow-hidden rounded-lg border border-border-default bg-surface shadow-lg animate-fade-in">
                          <button
                            onClick={() => {
                              setReportTarget({
                                type: "comment",
                                id: comment.id,
                              });
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-elevated hover:text-error"
                          >
                            <Flag size={14} />
                            Report Comment
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add comment bar */}
        <div className="border-t border-border-light bg-surface-elevated/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatarBase64} name={user?.displayName || "You"} size="xs" />
            <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-border-default bg-input-bg pr-1 transition-colors focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/20">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
                className="h-10 flex-1 bg-transparent px-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || sending}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-all",
                  commentText.trim()
                    ? "bg-brand-green text-white hover:bg-brand-green-dark"
                    : "text-text-tertiary",
                )}
              >
                {sending ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Modal */}
      <Modal open={!!reportTarget} onClose={closeReport} title="Report Comment">
        {reportSuccess ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10">
              <Flag size={20} className="text-brand-green" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Report submitted</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Thank you for helping keep the community safe.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Why are you reporting this comment?</p>

            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    reportReason === reason
                      ? "border-brand-green bg-brand-green/10 text-brand-green"
                      : "border-border-default text-text-secondary hover:border-brand-green/50 hover:text-text-primary",
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Add details (optional)..."
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={3}
            />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeReport}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleReport}
                loading={reportSending}
                disabled={!reportReason}
              >
                <Flag size={14} className="mr-1.5" />
                Submit Report
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
