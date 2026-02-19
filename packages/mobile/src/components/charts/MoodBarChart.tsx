import { MOOD_SCALE } from "@emovo/shared";
import { View, Text, StyleSheet } from "react-native";
import { BarChart } from "react-native-gifted-charts";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

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
      <Text style={styles.title}>Mood Distribution</Text>
      <View style={styles.chartWrapper}>
        <BarChart
          data={barData}
          barWidth={40}
          spacing={16}
          roundedTop
          roundedBottom
          noOfSections={5}
          yAxisThickness={0}
          xAxisThickness={0}
          hideRules
          isAnimated
          barBorderRadius={6}
          height={160}
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
