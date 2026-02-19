import { randomUUID } from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useState, useCallback, useEffect } from "react";
import Toast from "react-native-toast-message";

import { useMoodStore } from "../stores/mood.store";

export function useMoodLog() {
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [selectedTriggerIds, setSelectedTriggerIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logMood = useMoodStore((s) => s.logMood);
  const triggers = useMoodStore((s) => s.triggers);
  const isLoadingTriggers = useMoodStore((s) => s.isLoadingTriggers);
  const fetchTriggers = useMoodStore((s) => s.fetchTriggers);

  useEffect(() => {
    if (triggers.length === 0) {
      fetchTriggers();
    }
  }, [triggers.length, fetchTriggers]);

  const toggleTrigger = useCallback((id: string) => {
    setSelectedTriggerIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }, []);

  const reset = useCallback(() => {
    setMoodScore(null);
    setSelectedTriggerIds([]);
    setNote("");
  }, []);

  const submit = useCallback(async () => {
    if (moodScore === null) {
      Toast.show({ type: "error", text1: "Please select a mood" });
      return false;
    }

    setIsSubmitting(true);
    try {
      const entry = await logMood({
        moodScore,
        note: note.trim() || undefined,
        triggerIds: selectedTriggerIds.length > 0 ? selectedTriggerIds : undefined,
        clientEntryId: randomUUID(),
      });

      if (entry) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: "success", text1: "Mood logged!" });
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Toast.show({ type: "info", text1: "Saved offline", text2: "Will sync when back online" });
      }

      reset();
      return true;
    } catch {
      Toast.show({ type: "error", text1: "Failed to log mood" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [moodScore, note, selectedTriggerIds, logMood, reset]);

  return {
    moodScore,
    setMoodScore,
    selectedTriggerIds,
    toggleTrigger,
    note,
    setNote,
    triggers,
    isLoadingTriggers,
    isSubmitting,
    submit,
    reset,
  };
}
