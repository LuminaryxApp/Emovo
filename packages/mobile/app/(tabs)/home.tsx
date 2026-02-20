import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MoodLogForm } from "../../src/components/mood/MoodLogForm";
import { useAuthStore } from "../../src/stores/auth.store";
import { useMoodStore } from "../../src/stores/mood.store";
import { colors, gradients, cardShadow, cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii } from "../../src/theme/spacing";

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
        {/* Gradient Greeting Card */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={[styles.greetingCardOuter, { ...cardShadowStrong() }]}
        >
          <LinearGradient
            colors={[...gradients.greetingCard]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.greetingCard}
          >
            <Text style={styles.decorativeEmoji}>🌿</Text>
            <Text style={styles.date}>{today.toUpperCase()}</Text>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{user?.displayName || "there"}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Offline Banner */}
        {offlineCount > 0 && (
          <LinearGradient
            colors={["rgba(234, 179, 8, 0.15)", "rgba(249, 115, 22, 0.10)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.offlineBanner}
          >
            <Text style={styles.offlineIcon}>↑</Text>
            <Text style={styles.offlineText}>
              {offlineCount} mood{offlineCount > 1 ? "s" : ""} waiting to sync
            </Text>
          </LinearGradient>
        )}

        {/* Mood Form Card */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={[styles.formCard, { ...cardShadow() }]}
        >
          <MoodLogForm />
        </Animated.View>
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
  greetingCardOuter: {
    borderRadius: radii.xxl,
    marginBottom: spacing.xl,
    overflow: "hidden",
  },
  greetingCard: {
    borderRadius: radii.xxl,
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  decorativeEmoji: {
    position: "absolute",
    top: 16,
    right: 16,
    fontSize: 36,
    opacity: 0.3,
  },
  date: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    opacity: 0.85,
  },
  greeting: {
    fontSize: 28,
    fontFamily: "SourceSerif4_700Bold",
    color: "#FFFFFF",
    lineHeight: 34,
  },
  name: {
    fontSize: 28,
    fontFamily: "SourceSerif4_400Regular",
    color: "#FFFFFF",
    lineHeight: 34,
    opacity: 0.9,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.25)",
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
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
});
