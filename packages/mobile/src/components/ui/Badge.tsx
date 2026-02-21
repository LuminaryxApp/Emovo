import React, { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "error" | "info";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children?: ReactNode;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Color configs
// ---------------------------------------------------------------------------

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  primary: {
    bg: "rgba(117, 134, 60, 0.12)",
    text: colors.primary,
    dot: colors.primary,
  },
  secondary: {
    bg: "rgba(111, 152, 184, 0.12)",
    text: colors.accent,
    dot: colors.accent,
  },
  success: {
    bg: "rgba(117, 134, 60, 0.12)",
    text: colors.success,
    dot: colors.success,
  },
  warning: {
    bg: "rgba(234, 179, 8, 0.12)",
    text: "#A16207",
    dot: colors.warning,
  },
  error: {
    bg: "rgba(220, 38, 38, 0.10)",
    text: colors.error,
    dot: colors.error,
  },
  info: {
    bg: "rgba(111, 152, 184, 0.12)",
    text: colors.info,
    dot: colors.info,
  },
};

const SIZE_CONFIG: Record<
  BadgeSize,
  { paddingH: number; paddingV: number; fontSize: number; dotSize: number }
> = {
  sm: { paddingH: spacing.sm, paddingV: 2, fontSize: 11, dotSize: 6 },
  md: { paddingH: spacing.sm + 4, paddingV: spacing.xs, fontSize: 13, dotSize: 8 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Badge({
  variant = "primary",
  size = "sm",
  children,
  dot = false,
  style,
  testID,
}: BadgeProps) {
  const variantColors = VARIANT_COLORS[variant];
  const sizeConfig = SIZE_CONFIG[size];

  // Dot-only mode
  if (dot) {
    return (
      <View
        style={[
          styles.dot,
          {
            width: sizeConfig.dotSize,
            height: sizeConfig.dotSize,
            borderRadius: sizeConfig.dotSize / 2,
            backgroundColor: variantColors.dot,
          },
          style,
        ]}
        testID={testID}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantColors.bg,
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
        },
        style,
      ]}
      testID={testID}
    >
      {typeof children === "string" ? (
        <Text
          style={[
            styles.text,
            {
              fontSize: sizeConfig.fontSize,
              color: variantColors.text,
            },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.pill,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
