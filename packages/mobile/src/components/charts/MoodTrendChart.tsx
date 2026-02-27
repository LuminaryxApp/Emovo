import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from "react-native-svg";

import { useTheme } from "../../theme/ThemeContext";
import { cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

interface DataPoint {
  date: string;
  avgMood: number;
  count: number;
}

interface MoodTrendChartProps {
  dataPoints: DataPoint[];
  period: "week" | "month" | "year";
}

const CHART_HEIGHT = 140;
const CHART_PADDING_TOP = 20;
const CHART_PADDING_BOTTOM = 28;
const CARD_PADDING = 20;
const SCREEN_PADDING = 16;
const Y_MIN = 0;
const Y_MAX = 5;

function formatLabel(dateStr: string, period: string): string {
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return "";
  if (period === "year") {
    return date.toLocaleDateString(undefined, { month: "short" });
  }
  if (period === "month") {
    return date.toLocaleDateString(undefined, { day: "numeric" });
  }
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpx = (curr.x + next.x) / 2;
    d += ` C ${cpx} ${curr.y}, ${cpx} ${next.y}, ${next.x} ${next.y}`;
  }
  return d;
}

export function MoodTrendChart({ dataPoints, period }: MoodTrendChartProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - SCREEN_PADDING * 2 - CARD_PADDING * 2;
  const plotHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  const visiblePoints = useMemo(() => {
    // For month/year with many points, thin them out for cleaner display
    if (dataPoints.length <= 12) return dataPoints;
    const step = Math.ceil(dataPoints.length / 12);
    const thinned = dataPoints.filter((_, i) => i % step === 0);
    // Always include the last point
    if (thinned[thinned.length - 1] !== dataPoints[dataPoints.length - 1]) {
      thinned.push(dataPoints[dataPoints.length - 1]);
    }
    return thinned;
  }, [dataPoints]);

  const { plotPoints, labels } = useMemo(() => {
    const n = visiblePoints.length;
    if (n < 2) return { plotPoints: [], labels: [] };

    const xStep = chartWidth / (n - 1);
    const pts = visiblePoints.map((dp, i) => {
      const x = i * xStep;
      const normalized = (dp.avgMood - Y_MIN) / (Y_MAX - Y_MIN);
      const y = CHART_PADDING_TOP + plotHeight * (1 - normalized);
      return { x, y, value: dp.avgMood, date: dp.date };
    });

    // Labels — show ~5-6 evenly
    const labelInterval = Math.max(1, Math.floor(n / 5));
    const lbls = pts
      .filter((_, i) => i % labelInterval === 0 || i === n - 1)
      .map((pt) => ({
        x: pt.x,
        text: formatLabel(pt.date, period),
      }));

    return { plotPoints: pts, labels: lbls };
  }, [visiblePoints, chartWidth, plotHeight, period]);

  if (dataPoints.length < 2) return null;

  const linePath = buildSmoothPath(plotPoints);
  // Area: line path + close to bottom
  const lastPt = plotPoints[plotPoints.length - 1];
  const firstPt = plotPoints[0];
  const areaPath = `${linePath} L ${lastPt.x} ${CHART_HEIGHT - CHART_PADDING_BOTTOM} L ${firstPt.x} ${CHART_HEIGHT - CHART_PADDING_BOTTOM} Z`;

  // Y-axis guide lines (1-5)
  const guides = [1, 2, 3, 4, 5].map((val) => {
    const normalized = (val - Y_MIN) / (Y_MAX - Y_MIN);
    return CHART_PADDING_TOP + plotHeight * (1 - normalized);
  });

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="trending-up-outline" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>{t("charts.moodTrend")}</Text>
        </View>

        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <SvgGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.02} />
            </SvgGradient>
          </Defs>

          {/* Guide lines */}
          {guides.map((y, i) => (
            <Path
              key={i}
              d={`M 0 ${y} L ${chartWidth} ${y}`}
              stroke={colors.borderLight}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}

          {/* Area fill */}
          <Path d={areaPath} fill="url(#areaFill)" />

          {/* Line */}
          <Path
            d={linePath}
            stroke={colors.primary}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />

          {/* Data points */}
          {plotPoints.map((pt, i) => (
            <Circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill={colors.cardBackground}
              stroke={colors.primary}
              strokeWidth={2}
            />
          ))}
        </Svg>

        {/* X-axis labels */}
        <View style={styles.labelRow}>
          {labels.map((lbl, i) => (
            <Text key={i} style={[styles.xLabel, { color: colors.textTertiary, left: lbl.x }]}>
              {lbl.text}
            </Text>
          ))}
        </View>

        {/* Y-axis legend */}
        <View style={styles.yLegend}>
          <Text style={[styles.yLabel, { color: colors.textTertiary }]}>5</Text>
          <Text style={[styles.yLabel, { color: colors.textTertiary }]}>3</Text>
          <Text style={[styles.yLabel, { color: colors.textTertiary }]}>1</Text>
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
  labelRow: {
    position: "relative",
    height: 16,
    marginTop: 2,
  },
  xLabel: {
    position: "absolute",
    fontSize: 10,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    transform: [{ translateX: -16 }],
  },
  yLegend: {
    position: "absolute",
    right: CARD_PADDING + 4,
    top: CARD_PADDING + 36 + CHART_PADDING_TOP - 6,
    height: CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  yLabel: {
    fontSize: 9,
    fontFamily: "SourceSerif4_400Regular",
  },
});
