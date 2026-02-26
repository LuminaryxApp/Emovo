import { MOOD_SCALE } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";

import { useTheme } from "../../theme/ThemeContext";
import { cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

interface MoodBarChartProps {
  distribution: Record<number, number>;
}

const CHART_HORIZONTAL_PADDING = 20;
const CARD_PADDING = 20;
const SCREEN_PADDING = 16;

export function MoodBarChart({ distribution }: MoodBarChartProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const barData = MOOD_SCALE.map((mood) => ({
    value: distribution[mood.score] || 0,
    label: mood.emoji,
    frontColor: mood.color,
    gradientColor: mood.color + "80",
    topLabelComponent: () => (
      <Text style={[styles.barTopLabel, { color: colors.textSecondary }]}>
        {distribution[mood.score] || 0}
      </Text>
    ),
  }));

  const hasData = barData.some((d) => d.value > 0);
  if (!hasData) return null;

  // Calculate available width for the chart
  const screenWidth = Dimensions.get("window").width;
  const availableWidth =
    screenWidth - SCREEN_PADDING * 2 - CARD_PADDING * 2 - CHART_HORIZONTAL_PADDING * 2;
  const barWidth = Math.min(44, Math.floor((availableWidth - 5 * 14) / 5));
  const barSpacing = Math.max(10, Math.floor((availableWidth - barWidth * 5) / 5));

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="stats-chart-outline" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            {t("charts.moodDistribution")}
          </Text>
        </View>
        <View style={styles.chartWrapper}>
          <BarChart
            data={barData}
            barWidth={barWidth}
            spacing={barSpacing}
            roundedTop
            roundedBottom
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={0}
            hideRules
            isAnimated
            barBorderRadius={8}
            height={160}
            xAxisLabelTextStyle={[styles.xLabel, { color: colors.textSecondary }]}
            yAxisTextStyle={[styles.yLabel, { color: colors.textTertiary }]}
            disableScroll
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
    alignItems: "center",
    overflow: "visible",
    paddingTop: spacing.sm,
    paddingHorizontal: CHART_HORIZONTAL_PADDING,
  },
  xLabel: {
    fontSize: 18,
  },
  yLabel: {
    fontSize: 10,
    fontFamily: "SourceSerif4_400Regular",
  },
  barTopLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    marginBottom: 4,
  },
});
