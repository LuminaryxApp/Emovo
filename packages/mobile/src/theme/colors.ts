import { Platform } from "react-native";

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

// Widen literal types to string for theme switching compatibility
// Note: string must be checked before Record<number, string> because
// TypeScript considers string assignable to Record<number, string>.
type DeepWritable<T> = {
  -readonly [P in keyof T]: T[P] extends string
    ? string
    : T[P] extends Record<number, string>
      ? Record<number, string>
      : DeepWritable<T[P]>;
};

export type ThemeColors = DeepWritable<typeof colors>;

export const colors = {
  // Brand colors
  primary: "#75863C",
  primaryLight: "#8FA04E",
  primaryDark: "#5E6B30",
  primaryMuted: "rgba(117, 134, 60, 0.08)",

  accent: "#6F98B8",
  accentLight: "#8BB0C9",
  accentDark: "#5A7D99",

  // Surfaces
  background: "#FEFAE0",
  surface: "#FFFFFF",
  surfaceElevated: "#FDF7D0",
  cardBackground: "#FFFFFF",
  inputBackground: "#F7F6F0",

  // Dark mode (for future)
  backgroundDark: "#1A1A1A",
  surfaceDark: "#2A2A2A",
  surfaceElevatedDark: "#333333",
  textDark: "#F5F5F5",
  textSecondaryDark: "#9CA3AF",
  textMutedDark: "#6B7280",

  // Text
  text: "#1A1A1A",
  textSecondary: "#5C5C5C",
  textTertiary: "#8A8A8A",
  textInverse: "#FFFFFF",
  sectionLabel: "#8A8A6E",

  // Borders & Dividers
  border: "#E5E1C8",
  borderLight: "#F0ECDA",
  divider: "#EDEDDD",

  // Shadows — actually visible now
  cardShadow: "rgba(0, 0, 0, 0.08)",
  cardShadowStrong: "rgba(0, 0, 0, 0.12)",

  // Semantic
  success: "#75863C",
  warning: "#EAB308",
  error: "#DC2626",
  errorLight: "rgba(220, 38, 38, 0.08)",
  info: "#6F98B8",

  // Mood scale
  mood: {
    1: "#DC2626",
    2: "#F97316",
    3: "#EAB308",
    4: "#75863C",
    5: "#4A7A2E",
  } as Record<number, string>,

  // Mood glow — 20% opacity for glow rings around selected mood
  moodGlow: {
    1: "rgba(220, 38, 38, 0.20)",
    2: "rgba(249, 115, 22, 0.20)",
    3: "rgba(234, 179, 8, 0.20)",
    4: "rgba(117, 134, 60, 0.20)",
    5: "rgba(74, 122, 46, 0.20)",
  } as Record<number, string>,

  // Mood muted — 10% opacity for card background tints
  moodMuted: {
    1: "rgba(220, 38, 38, 0.10)",
    2: "rgba(249, 115, 22, 0.10)",
    3: "rgba(234, 179, 8, 0.10)",
    4: "rgba(117, 134, 60, 0.10)",
    5: "rgba(74, 122, 46, 0.10)",
  } as Record<number, string>,

  // Mood backgrounds — 12% opacity versions
  moodBg: {
    1: "rgba(220, 38, 38, 0.12)",
    2: "rgba(249, 115, 22, 0.12)",
    3: "rgba(234, 179, 8, 0.12)",
    4: "rgba(117, 134, 60, 0.12)",
    5: "rgba(74, 122, 46, 0.12)",
  } as Record<number, string>,

  // Overlays
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.25)",

  // Shadow colors
  shadowColor: "rgba(0, 0, 0, 0.08)",
  shadowColorMedium: "rgba(0, 0, 0, 0.12)",
  shadowColorLarge: "rgba(0, 0, 0, 0.16)",
} as const;

// Named gradient tuples for LinearGradient
export const gradients = {
  primary: ["#75863C", "#8FA04E"] as const,
  primaryButton: ["#75863C", "#5E6B30"] as const,
  authHeader: ["#75863C", "#8FA04E", "#FEFAE0"] as const,
  heroCard: ["#5E6B30", "#75863C", "#6F98B8"] as const,
  danger: ["#DC2626", "#B91C1C"] as const,
  warmSurface: ["#FFFFFF", "#FFFDF5"] as const,
  warmBackground: ["#FEFAE0", "#FFF8D6"] as const,
  accent: ["#6F98B8", "#8BB0C9"] as const,
  greetingCard: ["#75863C", "#6F98B8"] as const,

  // Mood gradients
  mood1: ["#DC2626", "#EF4444"] as const,
  mood2: ["#F97316", "#FB923C"] as const,
  mood3: ["#EAB308", "#FACC15"] as const,
  mood4: ["#75863C", "#8FA04E"] as const,
  mood5: ["#4A7A2E", "#5C9A3A"] as const,
};

// Dark theme colors — warm tones to complement the Emovo brand
export const darkColors: ThemeColors = {
  // Brand colors — slightly lifted for dark backgrounds
  primary: "#8FA04E",
  primaryLight: "#A3B462",
  primaryDark: "#75863C",
  primaryMuted: "rgba(143, 160, 78, 0.14)",

  accent: "#8BB0C9",
  accentLight: "#A0C2D6",
  accentDark: "#6F98B8",

  // Surfaces — warm dark olive/brown tones, not cold gray
  background: "#161810",
  surface: "#1F211A",
  surfaceElevated: "#282B22",
  cardBackground: "#1F211A",
  inputBackground: "#252820",

  // Legacy dark fields (kept for type compat)
  backgroundDark: "#161810",
  surfaceDark: "#1F211A",
  surfaceElevatedDark: "#282B22",
  textDark: "#EDECE4",
  textSecondaryDark: "#A8A79A",
  textMutedDark: "#7A7968",

  // Text — warm off-white instead of blue-white
  text: "#EDECE4",
  textSecondary: "#B5B4A8",
  textTertiary: "#7A7968",
  textInverse: "#FFFFFF",
  sectionLabel: "#A8A284",

  // Borders & Dividers — warm
  border: "#3A3C32",
  borderLight: "#2E302A",
  divider: "#2E302A",

  // Shadows
  cardShadow: "rgba(0, 0, 0, 0.3)",
  cardShadowStrong: "rgba(0, 0, 0, 0.5)",

  // Semantic — slightly brighter for dark bg contrast
  success: "#8FA04E",
  warning: "#FACC15",
  error: "#EF4444",
  errorLight: "rgba(239, 68, 68, 0.14)",
  info: "#8BB0C9",

  // Mood scale — slightly lighter for dark bg
  mood: {
    1: "#EF4444",
    2: "#FB923C",
    3: "#FACC15",
    4: "#8FA04E",
    5: "#5C9A3A",
  } as Record<number, string>,

  moodGlow: {
    1: "rgba(239, 68, 68, 0.25)",
    2: "rgba(251, 146, 60, 0.25)",
    3: "rgba(250, 204, 21, 0.25)",
    4: "rgba(143, 160, 78, 0.25)",
    5: "rgba(92, 154, 58, 0.25)",
  } as Record<number, string>,

  moodMuted: {
    1: "rgba(239, 68, 68, 0.15)",
    2: "rgba(251, 146, 60, 0.15)",
    3: "rgba(250, 204, 21, 0.15)",
    4: "rgba(143, 160, 78, 0.15)",
    5: "rgba(92, 154, 58, 0.15)",
  } as Record<number, string>,

  moodBg: {
    1: "rgba(239, 68, 68, 0.15)",
    2: "rgba(251, 146, 60, 0.15)",
    3: "rgba(250, 204, 21, 0.15)",
    4: "rgba(143, 160, 78, 0.15)",
    5: "rgba(92, 154, 58, 0.15)",
  } as Record<number, string>,

  // Overlays
  overlay: "rgba(0, 0, 0, 0.7)",
  overlayLight: "rgba(0, 0, 0, 0.4)",

  // Shadow colors
  shadowColor: "rgba(0, 0, 0, 0.3)",
  shadowColorMedium: "rgba(0, 0, 0, 0.4)",
  shadowColorLarge: "rgba(0, 0, 0, 0.5)",
} as const;

export const darkGradients = {
  primary: ["#75863C", "#8FA04E"] as const,
  primaryButton: ["#8FA04E", "#75863C"] as const,
  authHeader: ["#1F211A", "#282B22", "#161810"] as const,
  heroCard: ["#5E6B30", "#75863C", "#6F98B8"] as const,
  danger: ["#EF4444", "#DC2626"] as const,
  warmSurface: ["#1F211A", "#222419"] as const,
  warmBackground: ["#161810", "#1A1C14"] as const,
  accent: ["#6F98B8", "#8BB0C9"] as const,
  greetingCard: ["#75863C", "#6F98B8"] as const,

  mood1: ["#EF4444", "#F87171"] as const,
  mood2: ["#FB923C", "#FDBA74"] as const,
  mood3: ["#FACC15", "#FDE047"] as const,
  mood4: ["#8FA04E", "#A3B462"] as const,
  mood5: ["#5C9A3A", "#6DB34A"] as const,
};

// Cross-platform shadow helper
export function cardShadow() {
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  });
}

export function cardShadowStrong() {
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    default: {},
  });
}
