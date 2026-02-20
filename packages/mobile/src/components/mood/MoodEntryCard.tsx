import { MOOD_SCALE } from "@emovo/shared";
import type { MoodEntry } from "@emovo/shared";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { View, Text, StyleSheet } from "react-native";

import { colors, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";
import { AnimatedPressable } from "../ui/AnimatedPressable";

interface MoodEntryCardProps {
  entry: MoodEntry;
  onPress?: () => void;
}

export function MoodEntryCard({ entry, onPress }: MoodEntryCardProps) {
  const mood = MOOD_SCALE.find((m) => m.score === entry.moodScore) || MOOD_SCALE[2];
  const loggedDate = new Date(entry.loggedAt);

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleDown={0.98}
      disabled={!onPress}
      style={[styles.card, { ...cardShadow() }]}
    >
      {/* Gradient left strip */}
      <LinearGradient
        colors={[mood.color, mood.color + "80"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.leftStrip}
      />

      <View style={styles.content}>
        <View style={styles.body}>
          {/* Top row: emoji + label left, time right */}
          <View style={styles.topRow}>
            <View style={styles.moodInfo}>
              <Text style={styles.emoji}>{mood.emoji}</Text>
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </View>
            <Text style={styles.time}>{format(loggedDate, "h:mm a")}</Text>
          </View>

          {/* Note preview */}
          {entry.note && (
            <Text style={styles.note} numberOfLines={2}>
              {entry.note}
            </Text>
          )}

          {/* Trigger chips */}
          {entry.triggers.length > 0 && (
            <View style={styles.triggers}>
              {entry.triggers.map((trigger) => (
                <View
                  key={trigger.id}
                  style={[
                    styles.triggerChip,
                    {
                      backgroundColor: colors.moodMuted[entry.moodScore] || colors.primaryMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.triggerText,
                      {
                        color: colors.mood[entry.moodScore] || colors.primary,
                      },
                    ]}
                  >
                    {trigger.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Chevron */}
        {onPress && (
          <View style={styles.chevronContainer}>
            <Feather name="chevron-right" size={16} color={colors.textTertiary} />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    overflow: "hidden",
    position: "relative",
  },
  leftStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  content: {
    flexDirection: "row",
    padding: spacing.md,
    paddingLeft: spacing.md + 5,
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moodInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emoji: {
    fontSize: 28,
  },
  moodLabel: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
  },
  time: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  note: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  triggers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  triggerChip: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    justifyContent: "center",
  },
  triggerText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
  },
  chevronContainer: {
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
});
