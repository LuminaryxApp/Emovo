import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { colors } from "../../theme/colors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  /** Progress value between 0 and 100 */
  progress: number;
  /** Solid color for the fill (ignored when gradient is set) */
  color?: string;
  /** Gradient colors for the fill (overrides color) */
  gradient?: readonly [string, string, ...string[]];
  /** Track height in pixels */
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressBar({
  progress,
  color,
  gradient,
  height = 8,
  style,
  testID,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const widthAnim = useSharedValue(0);

  useEffect(() => {
    widthAnim.value = withSpring(clampedProgress, {
      damping: 20,
      stiffness: 90,
      mass: 1,
    });
  }, [clampedProgress, widthAnim]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${widthAnim.value}%` as unknown as number,
  }));

  const useGradient = !!gradient;
  const fillColor = color ?? colors.primary;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]} testID={testID}>
      <Animated.View style={[styles.fill, { height, borderRadius: height / 2 }, animatedFillStyle]}>
        {useGradient ? (
          <LinearGradient
            colors={[...gradient!]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: fillColor,
                borderRadius: height / 2,
              },
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.borderLight,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    overflow: "hidden",
  },
});
