import * as Haptics from "expo-haptics";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

type Period = "week" | "month" | "year";

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

const PERIODS: Period[] = ["week", "month", "year"];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <View style={styles.container}>
      {PERIODS.map((p) => (
        <TouchableOpacity
          key={p}
          style={[styles.button, value === p && styles.active]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(p);
          }}
        >
          <Text style={[styles.text, value === p && styles.textActive]}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: "center",
  },
  active: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
  },
  textActive: {
    color: colors.textInverse,
  },
});
