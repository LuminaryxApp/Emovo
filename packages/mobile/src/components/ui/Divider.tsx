import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DividerOrientation = "horizontal" | "vertical";

interface DividerProps {
  orientation?: DividerOrientation;
  spacing?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Divider({
  orientation = "horizontal",
  spacing: customSpacing,
  label,
  style,
}: DividerProps) {
  const { colors } = useTheme();
  const marginValue = customSpacing ?? spacing.md;

  // Vertical divider
  if (orientation === "vertical") {
    return (
      <View
        style={[
          styles.vertical,
          {
            backgroundColor: colors.divider,
            marginHorizontal: marginValue,
          },
          style,
        ]}
      />
    );
  }

  // Horizontal with label
  if (label) {
    return (
      <View
        style={[
          styles.labelContainer,
          {
            marginVertical: marginValue,
          },
          style,
        ]}
      >
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
        <Text style={[styles.label, { color: colors.textTertiary }]}>{label}</Text>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
      </View>
    );
  }

  // Plain horizontal
  return (
    <View
      style={[
        styles.horizontal,
        {
          backgroundColor: colors.divider,
          marginVertical: marginValue,
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  label: {
    ...typography.small,
    fontFamily: "SourceSerif4_600SemiBold",
    marginHorizontal: spacing.md,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
