import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { useTheme } from "../../theme/ThemeContext";
import { cardShadow } from "../../theme/colors";
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

const CARD_PADDING = 20;
const SCREEN_PADDING = 16;

function formatLabel(dateStr: string, period: string): string {
  const date = new Date(dateStr + "T00:00:00");
  if (period === "year") {
    return date.toLocaleDateString(undefined, { month: "short" });
  }
  if (period === "month") {
    return date.toLocaleDateString(undefined, { day: "numeric" });
  }
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function MoodLineChart({ dataPoints, period }: MoodLineChartProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (dataPoints.length < 2) return null;

  // Calculate available width
  const screenWidth = Dimensions.get("window").width;
  const chartAreaWidth = screenWidth - SCREEN_PADDING * 2 - CARD_PADDING * 2 - 40;

  // Determine spacing based on data density
  const numPoints = dataPoints.length;
  const idealSpacing = Math.max(20, Math.floor(chartAreaWidth / Math.max(numPoints - 1, 1)));
  const spacing_ = Math.min(60, idealSpacing);

  const labelInterval = Math.max(1, Math.floor(numPoints / 6));

  const lineData = dataPoints.map((dp, i) => ({
    value: dp.avgMood,
    label: i % labelInterval === 0 ? formatLabel(dp.date, period) : "",
    dataPointText: dp.avgMood.toFixed(1),
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="trending-up-outline" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>{t("charts.moodTrend")}</Text>
        </View>
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
            height={160}
            spacing={spacing_}
            textShiftY={-10}
            textColor={colors.textSecondary}
            textFontSize={10}
            startFillColor={colors.primaryLight}
            startOpacity={0.35}
            endOpacity={0}
            areaChart
            xAxisLabelTextStyle={[styles.xLabel, { color: colors.textTertiary }]}
            yAxisTextStyle={[styles.yLabel, { color: colors.textTertiary }]}
            scrollToEnd
          />
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
    padding: CARD_PADDING,
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
  chartWrapper: {
    paddingTop: spacing.md,
  },
  xLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
  },
  yLabel: {
    fontSize: 10,
    fontFamily: "SourceSerif4_400Regular",
  },
});
