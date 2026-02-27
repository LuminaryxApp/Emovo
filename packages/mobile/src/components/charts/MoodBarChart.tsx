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

  // Calculate bar sizing — account for the full card width minus padding
  const screenWidth = Dimensions.get("window").width;
  const chartAreaWidth = screenWidth - SCREEN_PADDING * 2 - CARD_PADDING * 2;
  const barWidth = Math.min(36, Math.floor(chartAreaWidth / 8));
  const barSpacing = Math.max(8, Math.floor((chartAreaWidth - barWidth * 5) / 6));

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
            initialSpacing={barSpacing / 2}
            roundedTop
            roundedBottom
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={0}
            hideRules
            hideYAxisText
            isAnimated
            barBorderRadius={8}
            height={150}
            xAxisLabelTextStyle={[styles.xLabel, { color: colors.textSecondary }]}
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
    paddingTop: spacing.sm,
  },
  xLabel: {
    fontSize: 18,
  },
  barTopLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    marginBottom: 4,
  },
});
