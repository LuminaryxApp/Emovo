import { MOOD_SCALE } from "@emovo/shared";
import * as Haptics from "expo-haptics";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

interface MoodSelectorProps {
  selectedScore: number | null;
  onSelect: (score: number) => void;
}

export function MoodSelector({ selectedScore, onSelect }: MoodSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>How are you feeling?</Text>
      <View style={styles.row}>
        {MOOD_SCALE.map((mood) => {
          const isSelected = selectedScore === mood.score;
          return (
            <TouchableOpacity
              key={mood.score}
              style={[
                styles.moodButton,
                { borderColor: mood.color },
                isSelected && { backgroundColor: mood.color },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(mood.score);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 18,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  moodButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },
  moodLabelSelected: {
    color: colors.textInverse,
    fontFamily: "SourceSerif4_600SemiBold",
  },
});
