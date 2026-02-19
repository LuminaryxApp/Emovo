import { View, Text, StyleSheet } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

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
  if (dataPoints.length < 2) return null;

  const lineData = dataPoints.map((dp, i) => ({
    value: dp.avgMood,
    label:
      i % Math.max(1, Math.floor(dataPoints.length / 5)) === 0 ? formatLabel(dp.date, period) : "",
    dataPointText: dp.avgMood.toFixed(1),
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mood Trend</Text>
      <View style={styles.chartWrapper}>
        <LineChart
          data={lineData}
          color={colors.primary}
          thickness={2}
          dataPointsColor={colors.primary}
          dataPointsRadius={4}
          noOfSections={4}
          maxValue={5}
          yAxisThickness={0}
          xAxisThickness={0}
          hideRules
          isAnimated
          curved
          height={160}
          spacing={dataPoints.length > 10 ? 30 : 50}
          textShiftY={-10}
          textColor={colors.textSecondary}
          textFontSize={10}
          startFillColor={colors.primaryLight}
          startOpacity={0.3}
          endOpacity={0}
          areaChart
        />
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
});
