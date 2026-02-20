import { MOOD_SCALE } from "@emovo/shared";
import * as Haptics from "expo-haptics";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { colors } from "../../theme/colors";

interface MoodSelectorProps {
  selectedScore: number | null;
  onSelect: (score: number) => void;
}

export function MoodSelector({ selectedScore, onSelect }: MoodSelectorProps) {
  return (
    <View style={styles.row}>
      {MOOD_SCALE.map((mood) => {
        const isSelected = selectedScore === mood.score;
        return (
          <View key={mood.score} style={styles.moodItem}>
            <TouchableOpacity
              style={[
                styles.circle,
                { borderColor: mood.color },
                isSelected && {
                  backgroundColor: mood.color,
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(mood.score);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{mood.emoji}</Text>
            </TouchableOpacity>
            <Text style={styles.label}>{mood.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  moodItem: {
    alignItems: "center",
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: 6,
  },
});
