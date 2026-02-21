import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { colors, gradients, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

interface MoodStreakProps {
  currentStreak: number;
  longestStreak: number;
}

export function MoodStreak({ currentStreak, longestStreak }: MoodStreakProps) {
  const isActive = currentStreak > 0;
  const isNewRecord = currentStreak >= longestStreak && currentStreak > 0;

  const flameScale = useSharedValue(1);
  const flameRotation = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Pulse animation for flame
      flameScale.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true,
      );
      // Subtle wobble
      flameRotation.value = withRepeat(
        withSequence(withTiming(5, { duration: 600 }), withTiming(-5, { duration: 600 })),
        -1,
        true,
      );
    } else {
      flameScale.value = withTiming(1, { duration: 200 });
      flameRotation.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, flameScale, flameRotation]);

  useEffect(() => {
    if (isNewRecord) {
      badgeScale.value = withSpring(1, { damping: 10, stiffness: 150 });
    } else {
      badgeScale.value = withTiming(0, { duration: 150 });
    }
  }, [isNewRecord, badgeScale]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }, { rotate: `${flameRotation.value}deg` }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  return (
    <View style={[styles.container, cardShadow()]}>
      {isActive ? (
        <LinearGradient
          colors={[gradients.primary[0], gradients.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        />
      ) : (
        <View style={styles.mutedBg} />
      )}

      <View style={styles.content}>
        {/* Flame + streak number */}
        <View style={styles.streakRow}>
          <Animated.View style={flameStyle}>
            <Text style={styles.flameEmoji}>{isActive ? "\u{1F525}" : "\u{1F9CA}"}</Text>
          </Animated.View>
          <Text
            style={[
              styles.streakNumber,
              isActive ? styles.streakNumberActive : styles.streakNumberInactive,
            ]}
          >
            {currentStreak}
          </Text>
          <Text
            style={[
              styles.streakUnit,
              isActive ? styles.streakUnitActive : styles.streakUnitInactive,
            ]}
          >
            {currentStreak === 1 ? "day" : "days"}
          </Text>
        </View>

        {/* Best streak subtitle */}
        <Text
          style={[
            styles.bestStreak,
            isActive ? styles.bestStreakActive : styles.bestStreakInactive,
          ]}
        >
          Best: {longestStreak} {longestStreak === 1 ? "day" : "days"}
        </Text>

        {/* New record badge */}
        {isNewRecord && (
          <Animated.View style={[styles.recordBadge, badgeStyle]}>
            <Text style={styles.recordBadgeText}>New record!</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    overflow: "hidden",
    position: "relative",
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  mutedBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.inputBackground,
  },
  content: {
    padding: spacing.md,
    alignItems: "center",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  flameEmoji: {
    fontSize: 28,
  },
  streakNumber: {
    fontSize: 36,
    fontFamily: "SourceSerif4_700Bold",
  },
  streakNumberActive: {
    color: colors.textInverse,
  },
  streakNumberInactive: {
    color: colors.textTertiary,
  },
  streakUnit: {
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 8,
  },
  streakUnitActive: {
    color: "rgba(255,255,255,0.85)",
  },
  streakUnitInactive: {
    color: colors.textTertiary,
  },
  bestStreak: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: spacing.xs,
  },
  bestStreakActive: {
    color: "rgba(255,255,255,0.7)",
  },
  bestStreakInactive: {
    color: colors.textTertiary,
  },
  recordBadge: {
    marginTop: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  recordBadgeText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
});
