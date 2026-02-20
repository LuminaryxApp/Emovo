import * as Haptics from "expo-haptics";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";

import { colors } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

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
          style={[styles.segment, value === p && styles.segmentActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(p);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, value === p && styles.labelActive]}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const activeShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: radii.pill,
    padding: 3,
    height: 44,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...activeShadow,
  },
  label: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textTertiary,
  },
  labelActive: {
    fontWeight: "700",
    color: colors.primary,
  },
});
