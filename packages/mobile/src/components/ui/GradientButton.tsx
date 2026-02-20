import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from "react-native";

import { colors, gradients, cardShadow } from "../../theme/colors";
import { radii } from "../../theme/spacing";

import { AnimatedPressable } from "./AnimatedPressable";

interface GradientButtonProps {
  onPress: () => void;
  title?: string;
  children?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger";
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function GradientButton({
  onPress,
  title,
  children,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
  testID,
}: GradientButtonProps) {
  const gradientColors = variant === "danger" ? gradients.danger : gradients.primaryButton;

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleDown={0.97}
      haptic
      disabled={disabled || loading}
      style={[styles.wrapper, style]}
      testID={testID}
    >
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, (disabled || loading) && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : children ? (
          children
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...cardShadow(),
  },
  gradient: {
    height: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textInverse,
  },
});
