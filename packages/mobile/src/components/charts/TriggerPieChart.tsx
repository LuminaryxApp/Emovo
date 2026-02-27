import { Ionicons } from "@expo/vector-icons";
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
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="pie-chart-outline" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            {t("charts.triggerBreakdown")}
          </Text>
        </View>
        <View style={styles.chartRow}>
          <View style={styles.pieWrap}>
            <PieChart
              data={pieData}
              radius={75}
              innerRadius={45}
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
          </View>
          <View style={styles.legend}>
            {triggers.slice(0, 6).map((item, i) => (
              <View key={item.trigger.name} style={styles.legendRow}>
                <View
                  style={[styles.legendDot, { backgroundColor: pieColors[i % pieColors.length] }]}
                />
                <Text style={[styles.legendName, { color: colors.text }]} numberOfLines={1}>
                  {item.trigger.name}
                </Text>
                <Text style={[styles.legendCount, { color: colors.textSecondary }]}>
                  {Math.round((item.count / total) * 100)}%
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
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radii.xxl,
    padding: 20,
    ...cardShadow(),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: "SourceSerif4_700Bold",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pieWrap: {
    padding: 4,
  },
  centerLabel: {
    alignItems: "center",
  },
  centerCount: {
    fontSize: 28,
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
    width: 10,
    height: 10,
    borderRadius: 5,
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
