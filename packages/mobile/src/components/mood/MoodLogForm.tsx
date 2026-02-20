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
      {/* Mood Section */}
      <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>
      <MoodSelector selectedScore={moodScore} onSelect={setMoodScore} />

      <View style={styles.sectionSpacer} />

      {/* Triggers Section */}
      <Text style={styles.sectionLabel}>WHAT'S ON YOUR MIND?</Text>
      <TriggerPicker
        triggers={triggers}
        selectedIds={selectedTriggerIds}
        onToggle={handleToggleTrigger}
        isLoading={isLoadingTriggers}
      />

      <View style={styles.sectionSpacer} />

      {/* Note Section */}
      <NoteInput value={note} onChangeText={setNote} />

      <View style={styles.sectionSpacer} />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, (!moodScore || isSubmitting) && styles.submitDisabled]}
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
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.sectionLabel,
    marginBottom: spacing.md,
  },
  sectionSpacer: {
    height: spacing.lg,
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textInverse,
  },
});
