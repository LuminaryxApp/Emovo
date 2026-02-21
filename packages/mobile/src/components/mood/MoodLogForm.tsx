import { randomUUID } from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";

import { useMoodStore } from "../../stores/mood.store";
import { colors, type MoodLevel } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { GradientButton } from "../ui/GradientButton";

import { MoodSelector } from "./MoodSelector";
import { NoteInput } from "./NoteInput";
import { TriggerPicker } from "./TriggerPicker";

export function MoodLogForm() {
  const { t } = useTranslation();
  const [moodScore, setMoodScore] = useState<MoodLevel | null>(null);
  const [selectedTriggerIds, setSelectedTriggerIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logMood = useMoodStore((s) => s.logMood);
  const triggers = useMoodStore((s) => s.triggers);

  const handleSubmit = async () => {
    if (moodScore === null) {
      Toast.show({ type: "error", text1: t("mood.selectMood") });
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
          text1: t("mood.logged"),
          text2: t("mood.loggedSubtitle"),
        });
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Toast.show({
          type: "info",
          text1: t("mood.savedOffline"),
          text2: t("mood.savedOfflineSubtitle"),
        });
      }

      // Reset form
      setMoodScore(null);
      setSelectedTriggerIds([]);
      setNote("");
    } catch {
      Toast.show({
        type: "error",
        text1: t("mood.logFailed"),
        text2: t("mood.logFailedSubtitle"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Mood Section */}
      <Animated.View entering={FadeInDown.delay(0).springify()}>
        <Text style={styles.sectionLabel}>{t("mood.howFeeling")}</Text>
        <MoodSelector value={moodScore ?? undefined} onChange={setMoodScore} />
      </Animated.View>

      <View style={styles.sectionSpacer} />

      {/* Triggers Section */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Text style={styles.sectionLabel}>{t("mood.whatsOnMind")}</Text>
        <TriggerPicker
          triggers={triggers}
          selectedIds={selectedTriggerIds}
          onChange={setSelectedTriggerIds}
        />
      </Animated.View>

      <View style={styles.sectionSpacer} />

      {/* Note Section */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <NoteInput value={note} onChange={setNote} />
      </Animated.View>

      <View style={styles.sectionSpacer} />

      {/* Submit */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <GradientButton
          title={t("mood.logMood")}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!moodScore}
        />
      </Animated.View>
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
    height: 32,
  },
});
