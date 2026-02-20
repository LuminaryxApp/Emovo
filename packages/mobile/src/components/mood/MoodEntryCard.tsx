import { MOOD_SCALE } from "@emovo/shared";
import type { MoodEntry } from "@emovo/shared";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

interface MoodEntryCardProps {
  entry: MoodEntry;
  onPress?: () => void;
}

export function MoodEntryCard({ entry, onPress }: MoodEntryCardProps) {
  const mood = MOOD_SCALE.find((m) => m.score === entry.moodScore) || MOOD_SCALE[2];
  const loggedDate = new Date(entry.loggedAt);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: mood.color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
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
                <View key={trigger.id} style={styles.triggerChip}>
                  <Text style={styles.triggerText}>{trigger.name}</Text>
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: 12,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    padding: spacing.md,
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
    backgroundColor: colors.primaryMuted,
    justifyContent: "center",
  },
  triggerText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.primary,
  },
  chevronContainer: {
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
});
