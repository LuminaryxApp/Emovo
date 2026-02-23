import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";

import { useTheme } from "../../theme/ThemeContext";
import { cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

interface TriggerData {
  trigger: { name: string };
  count: number;
  avgMood: number;
}

interface TriggerPieChartProps {
  triggers: TriggerData[];
}

export function TriggerPieChart({ triggers }: TriggerPieChartProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const pieColors = useMemo(
    () => [
      colors.primary,
      colors.accent,
      colors.primaryLight,
      colors.accentLight,
      colors.primaryDark,
      colors.accentDark,
      "#A3B86C",
      "#8BB0C8",
    ],
    [colors],
  );

  if (triggers.length === 0) return null;

  const total = triggers.reduce((sum, tr) => sum + tr.count, 0);

  const pieData = triggers.slice(0, 8).map((item, i) => ({
    value: item.count,
    color: pieColors[i % pieColors.length],
    text: `${Math.round((item.count / total) * 100)}%`,
  }));

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
        {t("charts.triggerBreakdown")}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
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
                <Text style={[styles.centerCount, { color: colors.text }]}>{total}</Text>
                <Text style={[styles.centerText, { color: colors.textTertiary }]}>
                  {t("charts.total")}
                </Text>
              </View>
            )}
          />
          <View style={styles.legend}>
            {triggers.slice(0, 8).map((item, i) => (
              <View key={item.trigger.name} style={styles.legendRow}>
                <View
                  style={[styles.legendDot, { backgroundColor: pieColors[i % pieColors.length] }]}
                />
                <Text style={[styles.legendName, { color: colors.text }]} numberOfLines={1}>
                  {item.trigger.name}
                </Text>
                <Text style={[styles.legendCount, { color: colors.textSecondary }]}>
                  {item.count}
                </Text>
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
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
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
  },
  centerText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
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
  },
  legendCount: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    marginLeft: spacing.sm,
  },
});
