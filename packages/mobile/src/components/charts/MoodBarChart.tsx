import { MOOD_SCALE } from "@emovo/shared";
import { View, Text, StyleSheet } from "react-native";
import { BarChart } from "react-native-gifted-charts";

import { colors, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

interface MoodBarChartProps {
  distribution: Record<number, number>;
}

export function MoodBarChart({ distribution }: MoodBarChartProps) {
  const barData = MOOD_SCALE.map((mood) => ({
    value: distribution[mood.score] || 0,
    label: mood.emoji,
    frontColor: mood.color,
  }));

  const hasData = barData.some((d) => d.value > 0);
  if (!hasData) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>MOOD DISTRIBUTION</Text>
      <View style={styles.card}>
        <View style={styles.chartWrapper}>
          <BarChart
            data={barData}
            barWidth={40}
            spacing={18}
            roundedTop
            roundedBottom
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={0}
            hideRules
            isAnimated
            barBorderRadius={8}
            height={150}
            xAxisLabelTextStyle={styles.xLabel}
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
    padding: 20,
    ...cardShadow(),
  },
  chartWrapper: {
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  xLabel: {
    fontSize: 16,
  },
});
