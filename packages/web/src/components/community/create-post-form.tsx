"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { useCommunityStore } from "@/stores/community.store";
import { MOOD_EMOJIS } from "@/theme/constants";

interface CreatePostFormProps {
  onCreated: () => void;
}

export function CreatePostForm({ onCreated }: CreatePostFormProps) {
  const createPost = useCommunityStore((s) => s.createPost);
  const [content, setContent] = useState("");
  const [moodScore, setMoodScore] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await createPost({ content: content.trim(), moodScore });
      setContent("");
      setMoodScore(undefined);
      onCreated();
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <Textarea
        placeholder="Share how you're feeling..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setMoodScore(moodScore === level ? undefined : level)}
              className={cn(
                "rounded-lg p-1.5 text-lg transition-all",
                moodScore === level
                  ? "scale-110 bg-brand-green/10"
                  : "opacity-50 hover:opacity-100",
              )}
            >
              {MOOD_EMOJIS[level]}
            </button>
          ))}
        </div>
        <Button onClick={handleSubmit} loading={loading} disabled={!content.trim()}>
          Post
        </Button>
      </div>
    </Card>
  );
}
