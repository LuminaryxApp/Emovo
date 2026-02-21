import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { ReactNode, useCallback } from "react";
import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { colors, gradients, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  onPress: () => void;
  title?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Size configs
// ---------------------------------------------------------------------------

const SIZE_CONFIG: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number; iconSize: number }
> = {
  sm: { height: 40, paddingHorizontal: spacing.md, fontSize: 14, iconSize: 16 },
  md: { height: 48, paddingHorizontal: spacing.lg, fontSize: 16, iconSize: 18 },
  lg: { height: 56, paddingHorizontal: spacing.xl, fontSize: 18, iconSize: 20 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Button({
  onPress,
  title,
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = true,
  leftIcon,
  rightIcon,
  style,
  testID,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const sizeConfig = SIZE_CONFIG[size];
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 350 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [haptic, onPress]);

  // Determine text & icon color based on variant
  const textColor =
    variant === "secondary" || variant === "ghost" ? colors.primary : colors.textInverse;

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={textColor} size="small" />;
    }

    if (children) {
      return <>{children}</>;
    }

    return (
      <>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={sizeConfig.iconSize}
            color={textColor}
            style={{ marginRight: spacing.xs }}
          />
        )}
        {title && (
          <Text
            style={[
              styles.text,
              {
                fontSize: sizeConfig.fontSize,
                color: textColor,
              },
            ]}
          >
            {title}
          </Text>
        )}
        {rightIcon && (
          <Ionicons
            name={rightIcon}
            size={sizeConfig.iconSize}
            color={textColor}
            style={{ marginLeft: spacing.xs }}
          />
        )}
      </>
    );
  };

  const baseContainerStyle: ViewStyle = {
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    borderRadius: radii.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: fullWidth ? "stretch" : "auto",
  };

  // Variant-specific rendering
  if (variant === "primary" || variant === "danger") {
    const gradientColors = variant === "danger" ? gradients.danger : gradients.primaryButton;

    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        testID={testID}
      >
        <Animated.View style={[styles.shadow, fullWidth && styles.fullWidth, style, animatedStyle]}>
          <LinearGradient
            colors={[...gradientColors]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[baseContainerStyle, isDisabled && styles.disabled]}
          >
            {renderContent()}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  // Secondary (outline) variant
  if (variant === "secondary") {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        testID={testID}
      >
        <Animated.View
          style={[
            baseContainerStyle,
            styles.secondary,
            isDisabled && styles.disabled,
            fullWidth && styles.fullWidth,
            style,
            animatedStyle,
          ]}
        >
          {renderContent()}
        </Animated.View>
      </Pressable>
    );
  }

  // Ghost (transparent) variant
  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      testID={testID}
    >
      <Animated.View
        style={[
          baseContainerStyle,
          styles.ghost,
          isDisabled && styles.disabled,
          fullWidth && styles.fullWidth,
          style,
          animatedStyle,
        ]}
      >
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  shadow: {
    ...cardShadow(),
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontWeight: "600",
  },
});
