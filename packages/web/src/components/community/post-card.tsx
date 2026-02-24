"use client";

import type { PostWithAuthor } from "@emovo/shared";
import { AxiosError } from "axios";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Flag,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { getPublicName } from "@/lib/display-name";
import { createReportApi } from "@/services/moderation.api";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";
import { MOOD_EMOJIS } from "@/theme/constants";

/* ------------------------------------------------------------------ */
/*  Report reason options                                              */
/* ------------------------------------------------------------------ */

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "hate_speech", label: "Hate Speech" },
  { value: "self_harm", label: "Self-Harm Concern" },
  { value: "misinformation", label: "Misinformation" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "other", label: "Other" },
] as const;

/* ------------------------------------------------------------------ */
/*  PostCard                                                           */
/* ------------------------------------------------------------------ */

interface PostCardProps {
  post: PostWithAuthor;
}

export function PostCard({ post }: PostCardProps) {
  const toggleLike = useCommunityStore((s) => s.toggleLike);
  const removePost = useCommunityStore((s) => s.removePost);
  const userId = useAuthStore((s) => s.user?.id);

  const isOwn = userId === post.userId;

  /* ---- Three-dot dropdown state ---- */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  /* ---- Report modal state ---- */
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStep, setReportStep] = useState<1 | 2>(1);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<"success" | "duplicate" | null>(null);

  const resetReport = useCallback(() => {
    setReportStep(1);
    setReportReason("");
    setReportDescription("");
    setReportLoading(false);
    setReportResult(null);
  }, []);

  const openReport = useCallback(() => {
    setMenuOpen(false);
    resetReport();
    setReportOpen(true);
  }, [resetReport]);

  const closeReport = useCallback(() => {
    setReportOpen(false);
  }, []);

  const submitReport = useCallback(async () => {
    if (!reportReason) return;
    setReportLoading(true);
    try {
      await createReportApi({
        targetType: "post",
        targetId: post.id,
        reason: reportReason,
        description: reportDescription.trim() || null,
      });
      setReportResult("success");
      setTimeout(() => closeReport(), 1500);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 409) {
        setReportResult("duplicate");
      }
    } finally {
      setReportLoading(false);
    }
  }, [reportReason, reportDescription, post.id, closeReport]);

  /* ---- Delete handler ---- */
  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    if (confirm("Delete this post?")) removePost(post.id);
  }, [removePost, post.id]);

  /* ---- Like animation ---- */
  const [likeAnimating, setLikeAnimating] = useState(false);

  const handleLike = useCallback(() => {
    if (!post.isLiked) setLikeAnimating(true);
    toggleLike(post.id);
  }, [toggleLike, post.id, post.isLiked]);

  return (
    <>
      <article
        className={cn(
          "relative rounded-2xl border border-border-light bg-surface p-5",
          "transition-colors duration-200 hover:bg-surface-elevated/50",
        )}
      >
        {/* ---- Header row ---- */}
        <div className="flex items-start gap-3">
          <Link href={`/profile/${post.userId}`} className="shrink-0">
            <Avatar name={post.author ? getPublicName(post.author) : "User"} size="md" />
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${post.userId}`}
              className="block text-[15px] font-bold text-text-primary hover:underline"
            >
              {post.author ? getPublicName(post.author) : "Anonymous"}
            </Link>
            <p className="text-xs text-text-tertiary">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>

          {/* Mood badge + menu */}
          <div className="flex shrink-0 items-center gap-2">
            {post.moodScore && (
              <Badge variant="mood" moodLevel={post.moodScore}>
                {MOOD_EMOJIS[post.moodScore]}
              </Badge>
            )}

            {/* Three-dot menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(
                  "rounded-full p-1.5 text-text-tertiary transition-colors",
                  "hover:bg-surface-elevated hover:text-text-secondary",
                )}
                aria-label="Post options"
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen && (
                <div
                  className={cn(
                    "absolute right-0 top-full z-20 mt-1 min-w-[160px]",
                    "rounded-xl border border-border-default bg-surface shadow-lg",
                    "overflow-hidden py-1",
                  )}
                >
                  {isOwn ? (
                    <button
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-error transition-colors hover:bg-error/10"
                    >
                      <Trash2 size={15} />
                      Delete Post
                    </button>
                  ) : (
                    <button
                      onClick={openReport}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface-elevated"
                    >
                      <Flag size={15} />
                      Report Post
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- Content ---- */}
        <p className="mt-3.5 text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap">
          {post.content}
        </p>

        {/* ---- Image ---- */}
        {post.imageBase64 && (
          <img
            src={`data:image/jpeg;base64,${post.imageBase64}`}
            alt="Post image"
            className="mt-4 rounded-xl max-h-96 w-full object-cover shadow-sm"
          />
        )}

        {/* ---- Action bar ---- */}
        <div className="mt-4 flex items-center gap-5 border-t border-border-light pt-3.5">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-colors",
              post.isLiked ? "text-error" : "text-text-tertiary hover:text-error",
            )}
          >
            <Heart
              size={18}
              className={cn(
                "transition-all duration-300",
                post.isLiked && "fill-current",
                likeAnimating && "animate-[like-pop_0.35s_ease-out]",
              )}
              onAnimationEnd={() => setLikeAnimating(false)}
            />
            <span>{post.likeCount}</span>
          </button>

          <Link
            href={`/community/post/${post.id}`}
            className="flex items-center gap-1.5 text-sm font-medium text-text-tertiary transition-colors hover:text-brand-green"
          >
            <MessageCircle size={18} />
            <span>{post.commentCount}</span>
          </Link>
        </div>
      </article>

      {/* ---- Report modal ---- */}
      <Modal open={reportOpen} onClose={closeReport} title="Report Post">
        {reportResult === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/15">
              <CheckCircle size={24} className="text-brand-green" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Report submitted</p>
            <p className="text-xs text-text-tertiary">Thank you. We'll review this post shortly.</p>
          </div>
        ) : reportResult === "duplicate" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
              <AlertCircle size={24} className="text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-text-primary">
              You've already reported this post
            </p>
            <p className="text-xs text-text-tertiary">Our team is already looking into it.</p>
            <Button variant="ghost" size="sm" onClick={closeReport} className="mt-2">
              Close
            </Button>
          </div>
        ) : reportStep === 1 ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">Why are you reporting this post?</p>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setReportReason(r.value);
                    setReportStep(2);
                  }}
                  className={cn(
                    "rounded-xl border border-border-default px-3 py-2.5 text-sm font-medium text-text-primary",
                    "transition-all duration-150 hover:border-brand-green hover:bg-brand-green/5 hover:text-brand-green",
                    "active:scale-[0.97]",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReportStep(1)}
                className="text-xs font-semibold text-brand-green hover:underline"
              >
                &larr; Back
              </button>
              <span className="text-xs text-text-tertiary">
                Reason: {REPORT_REASONS.find((r) => r.value === reportReason)?.label}
              </span>
            </div>

            <Textarea
              label="Additional details (optional)"
              placeholder="Tell us more about why you're reporting this post..."
              rows={4}
              maxLength={500}
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
            />
            <p className="text-right text-xs text-text-tertiary">{reportDescription.length}/500</p>

            <Button onClick={submitReport} loading={reportLoading} className="w-full">
              Submit Report
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
