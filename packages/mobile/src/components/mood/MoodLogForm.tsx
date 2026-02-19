import { randomUUID } from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import Toast from "react-native-toast-message";

import { useMoodStore } from "../../stores/mood.store";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

import { MoodSelector } from "./MoodSelector";
import { NoteInput } from "./NoteInput";
import { TriggerPicker } from "./TriggerPicker";

export function MoodLogForm() {
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [selectedTriggerIds, setSelectedTriggerIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logMood = useMoodStore((s) => s.logMood);
  const triggers = useMoodStore((s) => s.triggers);
  const isLoadingTriggers = useMoodStore((s) => s.isLoadingTriggers);

  const handleToggleTrigger = useCallback((id: string) => {
    setSelectedTriggerIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }, []);

  const handleSubmit = async () => {
    if (moodScore === null) {
      Toast.show({ type: "error", text1: "Please select a mood" });
      return;
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
        Toast.show({
          type: "success",
          text1: "Mood logged!",
          text2: "Keep tracking your emotions",
        });
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Toast.show({ type: "info", text1: "Saved offline", text2: "Will sync when back online" });
      }

      // Reset form
      setMoodScore(null);
      setSelectedTriggerIds([]);
      setNote("");
    } catch {
      Toast.show({ type: "error", text1: "Failed to log mood", text2: "Please try again" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <MoodSelector selectedScore={moodScore} onSelect={setMoodScore} />
      <TriggerPicker
        triggers={triggers}
        selectedIds={selectedTriggerIds}
        onToggle={handleToggleTrigger}
        isLoading={isLoadingTriggers}
      />
      <NoteInput value={note} onChangeText={setNote} />

      <TouchableOpacity
        style={[styles.submitButton, !moodScore && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!moodScore || isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.submitText}>Log Mood</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 18,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textInverse,
  },
});
