import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";

import { useTheme } from "../../theme/ThemeContext";
import { cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

interface TriggerData {
  trigger: { name: string };
  count: number;
  avgMood: number;
}

interface TriggerBreakdownProps {
  triggers: TriggerData[];
}

export function TriggerBreakdown({ triggers }: TriggerBreakdownProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const palette = useMemo(
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
  const items = triggers.slice(0, 6);
  const maxCount = Math.max(...items.map((i) => i.count));

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
          <View style={{ flex: 1 }} />
          <Text
            style={[
              styles.totalBadge,
              { color: colors.textTertiary, backgroundColor: colors.primaryMuted },
            ]}
          >
            {total} {t("charts.total")}
          </Text>
        </View>

        {/* Stacked proportion bar */}
        <View style={[styles.stackedBar, { backgroundColor: colors.borderLight }]}>
          {items.map((item, i) => {
            const pct = (item.count / total) * 100;
            return (
              <View
                key={item.trigger.name}
                style={[
                  styles.stackedSegment,
                  {
                    width: `${pct}%` as unknown as number,
                    backgroundColor: palette[i % palette.length],
                  },
                  i === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                  i === items.length - 1 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
                ]}
              />
            );
          })}
        </View>

        {/* Trigger rows */}
        {items.map((item, i) => {
          const pct = Math.round((item.count / total) * 100);
          const barWidth = (item.count / maxCount) * 100;
          const color = palette[i % palette.length];

          return (
            <View key={item.trigger.name} style={styles.triggerRow}>
              <View style={[styles.triggerDot, { backgroundColor: color }]} />
              <Text style={[styles.triggerName, { color: colors.text }]} numberOfLines={1}>
                {item.trigger.name}
              </Text>
              <View style={styles.triggerBarWrap}>
                <View
                  style={[
                    styles.triggerBar,
                    { width: `${barWidth}%` as unknown as number, backgroundColor: color + "30" },
                  ]}
                />
              </View>
              <Text style={[styles.triggerPct, { color: colors.textSecondary }]}>{pct}%</Text>
              <Text style={[styles.triggerCount, { color: colors.textTertiary }]}>
                {item.count}
              </Text>
            </View>
          );
        })}
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
  totalBadge: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: "hidden",
  },
  stackedBar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: spacing.md + 4,
  },
  stackedSegment: {
    height: 12,
  },
  triggerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    gap: spacing.sm,
  },
  triggerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  triggerName: {
    width: 80,
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
  },
  triggerBarWrap: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  triggerBar: {
    height: 6,
    borderRadius: 3,
  },
  triggerPct: {
    width: 32,
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    textAlign: "right",
  },
  triggerCount: {
    width: 20,
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "right",
  },
});
