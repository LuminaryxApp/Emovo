import { format } from "date-fns";
import { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MoodLogForm } from "../../src/components/mood/MoodLogForm";
import { useAuthStore } from "../../src/stores/auth.store";
import { useMoodStore } from "../../src/stores/mood.store";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const fetchTriggers = useMoodStore((s) => s.fetchTriggers);
  const syncOffline = useMoodStore((s) => s.syncOffline);
  const offlineCount = useMoodStore((s) => s.offlineCount);

  useEffect(() => {
    fetchTriggers();
    syncOffline();
  }, [fetchTriggers, syncOffline]);

  const greeting = getGreeting();
  const today = format(new Date(), "EEEE, MMM d");

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + spacing.lg }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.date}>{today.toUpperCase()}</Text>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{user?.displayName || "there"}</Text>
        </View>

        {/* Offline Banner */}
        {offlineCount > 0 && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineIcon}>↑</Text>
            <Text style={styles.offlineText}>
              {offlineCount} mood{offlineCount > 1 ? "s" : ""} waiting to sync
            </Text>
          </View>
        )}

        {/* Mood Form */}
        <View style={styles.formWrapper}>
          <MoodLogForm />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 32,
  },
  header: {
    marginBottom: spacing.xl,
  },
  date: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.sectionLabel,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  greeting: {
    fontSize: 28,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    lineHeight: 34,
  },
  name: {
    fontSize: 28,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    lineHeight: 34,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
  },
  offlineIcon: {
    fontSize: 14,
    color: colors.warning,
    marginRight: spacing.sm,
  },
  offlineText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },
  formWrapper: {
    flex: 1,
  },
});
