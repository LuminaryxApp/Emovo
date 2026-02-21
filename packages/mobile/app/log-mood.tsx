import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { MoodSelector } from "../src/components/mood/MoodSelector";
import { NoteInput } from "../src/components/mood/NoteInput";
import { TriggerPicker } from "../src/components/mood/TriggerPicker";
import { useMoodStore } from "../src/stores/mood.store";
import { colors, gradients } from "../src/theme/colors";
import { spacing, radii } from "../src/theme/spacing";

type MoodLevel = 1 | 2 | 3 | 4 | 5;

export default function LogMoodScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const triggers = useMoodStore((s) => s.triggers);
  const fetchTriggers = useMoodStore((s) => s.fetchTriggers);
  const logMood = useMoodStore((s) => s.logMood);

  const [mood, setMood] = useState<MoodLevel | undefined>();
  const [selectedTriggerIds, setSelectedTriggerIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTriggers();
  }, [fetchTriggers]);

  const handleMoodSelect = (level: MoodLevel) => {
    setMood(level);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSubmit = async () => {
    if (!mood) return;

    setIsSubmitting(true);
    try {
      const clientEntryId = Crypto.randomUUID();
      const entry = await logMood({
        moodScore: mood,
        triggerIds: selectedTriggerIds.length > 0 ? selectedTriggerIds : undefined,
        note: note.trim() || undefined,
        clientEntryId,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: t("mood.loggedTitle", "Mood Logged"),
        text2: entry
          ? t("mood.loggedMessage", "Your mood has been saved")
          : t("mood.savedOffline", "Saved offline, will sync later"),
      });
      router.back();
    } catch {
      Toast.show({
        type: "error",
        text1: t("errors.somethingWrong", "Something went wrong"),
        text2: t("errors.tryAgain", "Please try again"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.handleBar} />

      <View style={[styles.header, { paddingTop: spacing.sm }]}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>{t("logMood.title", "Log Mood")}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("logMood.howFeeling", "How are you feeling?")}</Text>
          <MoodSelector value={mood} onChange={handleMoodSelect} showLabels size="lg" />
        </View>

        <View style={styles.section}>
          <TriggerPicker
            triggers={triggers}
            selectedIds={selectedTriggerIds}
            onChange={setSelectedTriggerIds}
            maxSelections={5}
          />
        </View>

        <View style={styles.section}>
          <NoteInput
            value={note}
            onChange={setNote}
            placeholder={t("logMood.notePlaceholder", "What's on your mind? (optional)")}
          />
        </View>

        <View style={styles.submitSection}>
          <Pressable onPress={handleSubmit} disabled={!mood || isSubmitting}>
            <LinearGradient
              colors={[...gradients.primaryButton]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.submitButton, (!mood || isSubmitting) && styles.submitDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.submitText}>{t("logMood.saveEntry", "Save Entry")}</Text>
              )}
            </LinearGradient>
          </Pressable>

          {!mood && (
            <Text style={styles.hint}>
              {t("logMood.selectMoodHint", "Select a mood level to continue")}
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: spacing.sm + 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    width: 24,
  },
  headerTitle: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 20,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 24,
    color: colors.text,
    textAlign: "center",
  },
  submitSection: {
    gap: spacing.sm + 4,
    marginTop: spacing.md,
  },
  submitButton: {
    height: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 16,
    color: colors.textInverse,
  },
  hint: {
    fontFamily: "SourceSerif4_400Regular",
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
