import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { colors, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

interface DataPoint {
  date: string;
  avgMood: number;
  count: number;
}

interface MoodLineChartProps {
  dataPoints: DataPoint[];
  period: "week" | "month" | "year";
}

function formatLabel(dateStr: string, period: string): string {
  const date = new Date(dateStr);
  if (period === "year") {
    return date.toLocaleDateString(undefined, { month: "short" });
  }
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function MoodLineChart({ dataPoints, period }: MoodLineChartProps) {
  const { t } = useTranslation();

  if (dataPoints.length < 2) return null;

  const lineData = dataPoints.map((dp, i) => ({
    value: dp.avgMood,
    label:
      i % Math.max(1, Math.floor(dataPoints.length / 5)) === 0 ? formatLabel(dp.date, period) : "",
    dataPointText: dp.avgMood.toFixed(1),
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{t("charts.moodTrend")}</Text>
      <View style={styles.card}>
        <View style={styles.chartWrapper}>
          <LineChart
            data={lineData}
            color={colors.primary}
            thickness={3}
            dataPointsColor={colors.primary}
            dataPointsRadius={5}
            noOfSections={4}
            maxValue={5}
            yAxisThickness={0}
            xAxisThickness={0}
            hideRules
            isAnimated
            curved
            height={150}
            spacing={dataPoints.length > 10 ? 30 : 50}
            textShiftY={-10}
            textColor={colors.textSecondary}
            textFontSize={10}
            startFillColor={colors.primaryLight}
            startOpacity={0.35}
            endOpacity={0}
            areaChart
            xAxisLabelTextStyle={styles.xLabel}
            yAxisTextStyle={styles.yLabel}
          />
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
  chartWrapper: {
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  xLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  yLabel: {
    fontSize: 10,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
});
