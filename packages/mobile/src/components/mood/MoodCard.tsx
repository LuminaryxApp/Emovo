import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";

import { colors, gradients, type MoodLevel, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

const MOOD_DATA: Record<
  MoodLevel,
  { emoji: string; label: string; gradient: readonly [string, string] }
> = {
  1: { emoji: "\u{1F622}", label: "Very Low", gradient: gradients.mood1 },
  2: { emoji: "\u{1F61F}", label: "Low", gradient: gradients.mood2 },
  3: { emoji: "\u{1F610}", label: "Neutral", gradient: gradients.mood3 },
  4: { emoji: "\u{1F60A}", label: "Good", gradient: gradients.mood4 },
  5: { emoji: "\u{1F604}", label: "Great", gradient: gradients.mood5 },
};

interface MoodCardProps {
  mood?: MoodLevel;
  loggedAt?: string;
  onPress?: () => void;
  onLogMood?: () => void;
}

function EmptyState({ onLogMood }: { onLogMood?: () => void }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.05, { duration: 1500 }), withTiming(1, { duration: 1500 })),
      -1,
      true,
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Pressable onPress={onLogMood} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
      <View style={[styles.card, styles.emptyCard, cardShadow()]}>
        <Animated.View style={[styles.emptyIconContainer, pulseStyle]}>
          <Ionicons name="add-circle-outline" size={40} color={colors.primary} />
        </Animated.View>
        <Text style={styles.emptyTitle}>How are you feeling?</Text>
        <Text style={styles.emptySubtitle}>Tap to log your mood</Text>
      </View>
    </Pressable>
  );
}

function FilledState({
  mood,
  loggedAt,
  onPress,
}: {
  mood: MoodLevel;
  loggedAt?: string;
  onPress?: () => void;
}) {
  const moodInfo = MOOD_DATA[mood];
  const entryScale = useSharedValue(0.95);

  useEffect(() => {
    entryScale.value = withSpring(1, { damping: 14, stiffness: 150 });
  }, [entryScale]);

  const entryStyle = useAnimatedStyle(() => ({
    transform: [{ scale: entryScale.value }],
  }));

  const formattedTime = loggedAt ? format(new Date(loggedAt), "h:mm a") : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [pressed && onPress && { opacity: 0.95 }]}
    >
      <Animated.View style={[styles.card, entryStyle, { ...cardShadow() }]}>
        <LinearGradient
          colors={[moodInfo.gradient[0], moodInfo.gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />
        <View style={styles.filledContent}>
          <Text style={styles.filledEmoji}>{moodInfo.emoji}</Text>
          <View style={styles.filledTextContainer}>
            <Text style={styles.filledLabel}>{moodInfo.label}</Text>
            {formattedTime && <Text style={styles.filledTime}>Logged at {formattedTime}</Text>}
          </View>
          {onPress && <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function MoodCard({ mood, loggedAt, onPress, onLogMood }: MoodCardProps) {
  if (!mood) {
    return <EmptyState onLogMood={onLogMood} />;
  }

  return <FilledState mood={mood} loggedAt={loggedAt} onPress={onPress} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: "hidden",
    minHeight: 100,
  },
  // Empty state
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyIconContainer: {
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  // Filled state
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  filledContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
  },
  filledEmoji: {
    fontSize: 44,
    marginRight: spacing.md,
  },
  filledTextContainer: {
    flex: 1,
  },
  filledLabel: {
    fontSize: 22,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.textInverse,
  },
  filledTime: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
});
