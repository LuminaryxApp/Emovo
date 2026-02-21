import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { ReactNode, useCallback } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { colors, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CardVariant = "elevated" | "outlined" | "filled" | "gradient";
type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  gradientColors?: readonly [string, string, ...string[]];
  testID?: string;
}

// ---------------------------------------------------------------------------
// Padding map
// ---------------------------------------------------------------------------

const PADDING_MAP: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Card({
  variant = "elevated",
  padding = "md",
  onPress,
  style,
  children,
  gradientColors,
  testID,
}: CardProps) {
  const scale = useSharedValue(1);
  const isPressable = !!onPress;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!isPressable) return;
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  }, [isPressable, scale]);

  const handlePressOut = useCallback(() => {
    if (!isPressable) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [isPressable, scale]);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const containerPadding = PADDING_MAP[padding];

  // Variant-specific styles
  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: colors.surface,
          ...cardShadow(),
        };
      case "outlined":
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case "filled":
        return {
          backgroundColor: colors.surfaceElevated,
        };
      case "gradient":
        return {};
      default:
        return {
          backgroundColor: colors.surface,
        };
    }
  })();

  // Gradient variant
  if (variant === "gradient") {
    const gColors = gradientColors ?? (["#75863C", "#6F98B8"] as const);

    const content = (
      <Animated.View style={[style, animatedStyle]}>
        <LinearGradient
          colors={[...gColors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, { padding: containerPadding }]}
        >
          {children}
        </LinearGradient>
      </Animated.View>
    );

    if (isPressable) {
      return (
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          testID={testID}
        >
          {content}
        </Pressable>
      );
    }

    return content;
  }

  // Non-gradient variants
  const content = (
    <Animated.View
      style={[styles.base, variantStyle, { padding: containerPadding }, style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );

  if (isPressable) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    overflow: "hidden",
  },
});
