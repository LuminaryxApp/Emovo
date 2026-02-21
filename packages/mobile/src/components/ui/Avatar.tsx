import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { colors, gradients } from "../../theme/colors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  source?: ImageSourcePropType;
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Size configs
// ---------------------------------------------------------------------------

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  "2xl": 80,
  "3xl": 96,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  "2xl": 30,
  "3xl": 36,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a deterministic gradient based on the name string.
 * Picks from a set of pleasant gradient pairs.
 */
const GRADIENT_PAIRS: readonly (readonly [string, string])[] = [
  gradients.greetingCard,
  gradients.heroCard.slice(0, 2) as unknown as readonly [string, string],
  ["#6F98B8", "#5A7E9E"] as const,
  ["#8FA04E", "#5E6B30"] as const,
  ["#75863C", "#4A7A2E"] as const,
  ["#5A7E9E", "#75863C"] as const,
];

function getGradientForName(name: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[index];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Avatar({ name, size = "md", source, uri, style, testID }: AvatarProps) {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const borderRadius = dimension / 2;

  const gradientColors = useMemo(() => getGradientForName(name), [name]);
  const initials = useMemo(() => getInitials(name), [name]);

  // URI-based avatar (base64 or remote URL)
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          {
            width: dimension,
            height: dimension,
            borderRadius,
          },
          style as StyleProp<ImageStyle>,
        ]}
        testID={testID}
      />
    );
  }

  // Image avatar (static source)
  if (source) {
    return (
      <Image
        source={source}
        style={[
          {
            width: dimension,
            height: dimension,
            borderRadius,
          },
          style as StyleProp<ImageStyle>,
        ]}
        testID={testID}
      />
    );
  }

  // Initials avatar with gradient background
  return (
    <LinearGradient
      colors={[...gradientColors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.initialsContainer,
        {
          width: dimension,
          height: dimension,
          borderRadius,
        },
        style,
      ]}
      testID={testID}
    >
      <Text style={[styles.initialsText, { fontSize }]}>{initials}</Text>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  initialsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: colors.textInverse,
    fontFamily: "SourceSerif4_700Bold",
    fontWeight: "700",
  },
});
