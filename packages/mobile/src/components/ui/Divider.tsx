import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors } from "../../theme/colors";
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
  const marginValue = customSpacing ?? spacing.md;

  // Vertical divider
  if (orientation === "vertical") {
    return (
      <View
        style={[
          styles.vertical,
          {
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
        <View style={styles.line} />
        <Text style={styles.label}>{label}</Text>
        <View style={styles.line} />
      </View>
    );
  }

  // Plain horizontal
  return (
    <View
      style={[
        styles.horizontal,
        {
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
    backgroundColor: colors.divider,
    alignSelf: "stretch",
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
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
    backgroundColor: colors.divider,
  },
  label: {
    ...typography.small,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
