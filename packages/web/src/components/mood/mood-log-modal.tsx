"use client";

import type { MoodEntry } from "@emovo/shared";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { useMoodStore } from "@/stores/mood.store";
import { MOOD_EMOJIS, MOOD_LABELS } from "@/theme/constants";

interface MoodLogModalProps {
  open: boolean;
  onClose: () => void;
  onLogged: (entry: MoodEntry) => void;
}

export function MoodLogModal({ open, onClose, onLogged }: MoodLogModalProps) {
  const { triggers, fetchTriggers, logMood } = useMoodStore();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && triggers.length === 0) {
      fetchTriggers();
    }
  }, [open, triggers.length, fetchTriggers]);

  const handleSubmit = async () => {
    if (!selectedMood) return;
    setLoading(true);
    try {
      await logMood({
        moodScore: selectedMood,
        note: note || undefined,
        triggerIds: selectedTriggers.length > 0 ? selectedTriggers : undefined,
        clientEntryId: crypto.randomUUID(),
      });
      // Get the latest entry from the store
      const entries = useMoodStore.getState().entries;
      if (entries.length > 0) onLogged(entries[0]);
      resetForm();
      onClose();
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedMood(null);
    setSelectedTriggers([]);
    setNote("");
  };

  const toggleTrigger = (id: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Log Your Mood" className="max-w-md">
      <div className="space-y-6">
        {/* Mood selector */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase text-section-label">
            How are you feeling?
          </p>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedMood(level)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl p-3 transition-all",
                  selectedMood === level
                    ? "scale-110 bg-brand-green/10 ring-2 ring-brand-green"
                    : "hover:bg-surface-elevated",
                )}
              >
                <span className="text-3xl">{MOOD_EMOJIS[level]}</span>
                <span className="text-xs font-medium text-text-secondary">
                  {MOOD_LABELS[level]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Triggers */}
        {triggers.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase text-section-label">
              What&apos;s affecting your mood?
            </p>
            <div className="flex flex-wrap gap-2">
              {triggers.map((trigger) => (
                <button
                  key={trigger.id}
                  type="button"
                  onClick={() => toggleTrigger(trigger.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedTriggers.includes(trigger.id)
                      ? "border-brand-green bg-brand-green/10 text-brand-green"
                      : "border-border-default text-text-secondary hover:border-brand-green",
                  )}
                >
                  {trigger.icon && <span className="mr-1">{trigger.icon}</span>}
                  {trigger.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <Textarea
          label="Note (optional)"
          placeholder="What's on your mind?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
        />

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!selectedMood}
          size="lg"
          className="w-full"
        >
          Save Entry
        </Button>
      </div>
    </Modal>
  );
}
