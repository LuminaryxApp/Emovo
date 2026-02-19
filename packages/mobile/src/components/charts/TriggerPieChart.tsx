import { View, Text, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

interface TriggerData {
  trigger: { name: string };
  count: number;
  avgMood: number;
}

interface TriggerPieChartProps {
  triggers: TriggerData[];
}

const PIE_COLORS = [
  colors.primary,
  colors.accent,
  colors.primaryLight,
  colors.accentLight,
  colors.primaryDark,
  colors.accentDark,
  "#A3B86C",
  "#8BB0C8",
];

export function TriggerPieChart({ triggers }: TriggerPieChartProps) {
  if (triggers.length === 0) return null;

  const total = triggers.reduce((sum, t) => sum + t.count, 0);

  const pieData = triggers.slice(0, 8).map((item, i) => ({
    value: item.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
    text: `${Math.round((item.count / total) * 100)}%`,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trigger Breakdown</Text>
      <View style={styles.chartWrapper}>
        <PieChart
          data={pieData}
          radius={80}
          innerRadius={45}
          textColor={colors.textInverse}
          textSize={10}
          showText
          focusOnPress
          innerCircleColor={colors.surface}
          centerLabelComponent={() => (
            <View style={styles.centerLabel}>
              <Text style={styles.centerCount}>{total}</Text>
              <Text style={styles.centerText}>total</Text>
            </View>
          )}
        />
        <View style={styles.legend}>
          {triggers.slice(0, 8).map((item, i) => (
            <View key={item.trigger.name} style={styles.legendRow}>
              <View
                style={[styles.legendDot, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]}
              />
              <Text style={styles.legendName} numberOfLines={1}>
                {item.trigger.name}
              </Text>
              <Text style={styles.legendCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  centerLabel: {
    alignItems: "center",
  },
  centerCount: {
    fontSize: 20,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
  },
  centerText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  legend: {
    width: "100%",
    marginTop: spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },
  legendCount: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
  },
});
