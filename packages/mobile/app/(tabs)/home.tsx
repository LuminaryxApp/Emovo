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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + spacing.md }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name}>{user?.displayName || "there"}</Text>

        {offlineCount > 0 && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              {offlineCount} mood{offlineCount > 1 ? "s" : ""} waiting to sync
            </Text>
          </View>
        )}

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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greeting: {
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },
  name: {
    fontSize: 28,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.xl,
  },
  offlineBanner: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  offlineText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textInverse,
    textAlign: "center",
  },
  formWrapper: {
    flex: 1,
  },
});
