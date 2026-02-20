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
      <Text style={styles.sectionLabel}>TRIGGER BREAKDOWN</Text>
      <View style={styles.card}>
        <View style={styles.chartRow}>
          <PieChart
            data={pieData}
            radius={72}
            innerRadius={42}
            textColor={colors.textInverse}
            textSize={10}
            showText
            focusOnPress
            innerCircleColor={colors.cardBackground}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.sectionLabel,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  centerLabel: {
    alignItems: "center",
  },
  centerCount: {
    fontSize: 22,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
  },
  centerText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: -2,
  },
  legend: {
    flex: 1,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    marginLeft: spacing.sm,
  },
});
