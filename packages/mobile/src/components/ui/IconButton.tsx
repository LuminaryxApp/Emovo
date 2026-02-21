import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { colors, cardShadow } from "../../theme/colors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IconButtonVariant = "ghost" | "filled" | "outlined";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Size configs
// ---------------------------------------------------------------------------

const SIZE_CONFIG: Record<IconButtonSize, { containerSize: number; iconSize: number }> = {
  sm: { containerSize: 32, iconSize: 16 },
  md: { containerSize: 40, iconSize: 20 },
  lg: { containerSize: 48, iconSize: 24 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IconButton({
  icon,
  onPress,
  variant = "ghost",
  size = "md",
  color,
  disabled = false,
  style,
  testID,
}: IconButtonProps) {
  const scale = useSharedValue(1);
  const sizeConfig = SIZE_CONFIG[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 350 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  // Determine icon color
  const iconColor = color ?? (variant === "filled" ? colors.textInverse : colors.text);

  // Variant styles
  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case "filled":
        return {
          backgroundColor: colors.primary,
          ...cardShadow(),
        };
      case "outlined":
        return {
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      case "ghost":
      default:
        return {
          backgroundColor: "transparent",
        };
    }
  })();

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={8}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.base,
          variantStyle,
          {
            width: sizeConfig.containerSize,
            height: sizeConfig.containerSize,
            borderRadius: sizeConfig.containerSize / 2,
          },
          disabled && styles.disabled,
          style,
          animatedStyle,
        ]}
      >
        <Ionicons name={icon} size={sizeConfig.iconSize} color={iconColor} />
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
});
