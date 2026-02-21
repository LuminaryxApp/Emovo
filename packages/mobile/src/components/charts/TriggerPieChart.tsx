import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";

import { colors, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

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
  const { t } = useTranslation();

  if (triggers.length === 0) return null;

  const total = triggers.reduce((sum, t) => sum + t.count, 0);

  const pieData = triggers.slice(0, 8).map((item, i) => ({
    value: item.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
    text: `${Math.round((item.count / total) * 100)}%`,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{t("charts.triggerBreakdown")}</Text>
      <View style={styles.card}>
        <View style={styles.chartRow}>
          <PieChart
            data={pieData}
            radius={80}
            innerRadius={50}
            textColor={colors.textInverse}
            textSize={10}
            showText
            focusOnPress
            innerCircleColor={colors.cardBackground}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={styles.centerCount}>{total}</Text>
                <Text style={styles.centerText}>{t("charts.total")}</Text>
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
    borderRadius: radii.xl,
    padding: spacing.md,
    ...cardShadow(),
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
    fontSize: 36,
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
