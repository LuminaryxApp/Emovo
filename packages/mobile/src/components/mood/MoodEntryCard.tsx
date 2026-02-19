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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.header}>
        <View style={[styles.moodBadge, { backgroundColor: mood.color }]}>
          <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.moodLabel}>{mood.label}</Text>
          <Text style={styles.date}>
            {format(loggedDate, "MMM d, yyyy")} at {format(loggedDate, "h:mm a")}
          </Text>
        </View>
        {onPress && <Feather name="chevron-right" size={20} color={colors.textTertiary} />}
      </View>

      {entry.note && (
        <Text style={styles.note} numberOfLines={2}>
          {entry.note}
        </Text>
      )}

      {entry.triggers.length > 0 && (
        <View style={styles.triggers}>
          {entry.triggers.map((trigger) => (
            <View key={trigger.id} style={styles.triggerChip}>
              <Text style={styles.triggerText}>{trigger.name}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  moodBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  moodEmoji: {
    fontSize: 22,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  moodLabel: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
  },
  date: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: 2,
  },
  note: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  triggers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  triggerChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  triggerText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.primary,
  },
});
