import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { View, Text, StyleSheet } from "react-native";

import { useTheme } from "../../theme/ThemeContext";
import { type MoodLevel, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";
import { AnimatedPressable } from "../ui/AnimatedPressable";

const MOOD_INFO: Record<
  MoodLevel,
  { emoji: string; label: string; color: string; colorFaded: string }
> = {
  1: {
    emoji: "\u{1F622}",
    label: "Very Low",
    color: "#DC2626",
    colorFaded: "#DC262680",
  },
  2: { emoji: "\u{1F61F}", label: "Low", color: "#F97316", colorFaded: "#F9731680" },
  3: {
    emoji: "\u{1F610}",
    label: "Neutral",
    color: "#EAB308",
    colorFaded: "#EAB30880",
  },
  4: {
    emoji: "\u{1F60A}",
    label: "Good",
    color: "#75863C",
    colorFaded: "#75863C80",
  },
  5: {
    emoji: "\u{1F604}",
    label: "Great",
    color: "#4A7A2E",
    colorFaded: "#4A7A2E80",
  },
};

interface Trigger {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
}

interface MoodEntryCardEntry {
  id: string;
  moodScore: MoodLevel;
  note?: string | null;
  triggers?: Trigger[];
  loggedAt: string;
}

interface MoodEntryCardProps {
  entry: MoodEntryCardEntry;
  onPress?: () => void;
}

export function MoodEntryCard({ entry, onPress }: MoodEntryCardProps) {
  const { colors } = useTheme();
  const mood = MOOD_INFO[entry.moodScore as MoodLevel] ?? MOOD_INFO[3];
  const loggedDate = new Date(entry.loggedAt);
  const triggers = entry.triggers ?? [];
  const visibleTriggers = triggers.slice(0, 3);
  const extraCount = triggers.length - 3;

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleDown={0.98}
      disabled={!onPress}
      style={[styles.card, cardShadow(), { backgroundColor: colors.cardBackground }]}
    >
      {/* Left gradient strip */}
      <LinearGradient
        colors={[mood.color, mood.colorFaded]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.leftStrip}
      />

      <View style={styles.content}>
        <View style={styles.body}>
          {/* Top row: emoji + label (left), time (right) */}
          <View style={styles.topRow}>
            <View style={styles.moodInfo}>
              <Text style={styles.emoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, { color: colors.text }]}>{mood.label}</Text>
            </View>
            <Text style={[styles.time, { color: colors.textTertiary }]}>
              {format(loggedDate, "h:mm a")}
            </Text>
          </View>

          {/* Note preview */}
          {entry.note ? (
            <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={2}>
              {entry.note}
            </Text>
          ) : null}

          {/* Trigger chips */}
          {visibleTriggers.length > 0 && (
            <View style={styles.triggers}>
              {visibleTriggers.map((trigger) => (
                <View
                  key={trigger.id}
                  style={[styles.triggerChip, { backgroundColor: colors.moodBg[entry.moodScore] }]}
                >
                  <Text style={[styles.triggerText, { color: mood.color }]}>{trigger.name}</Text>
                </View>
              ))}
              {extraCount > 0 && (
                <View
                  style={[styles.triggerChip, { backgroundColor: colors.moodBg[entry.moodScore] }]}
                >
                  <Text style={[styles.triggerText, { color: mood.color }]}>+{extraCount}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Chevron */}
        {onPress && (
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    overflow: "hidden",
    position: "relative",
  },
  leftStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  content: {
    flexDirection: "row",
    padding: spacing.md,
    paddingLeft: spacing.md + 3,
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
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 28,
  },
  moodLabel: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  time: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
  },
  note: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: spacing.sm,
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
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
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
