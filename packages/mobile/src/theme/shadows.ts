import { Platform, ViewStyle } from "react-native";

const iosShadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  "2xl": {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
} as const;

const androidElevations = {
  none: 0,
  sm: 1,
  md: 3,
  lg: 6,
  xl: 12,
  "2xl": 18,
} as const;

export function getShadow(level: keyof typeof iosShadows): ViewStyle {
  if (Platform.OS === "android") {
    return { elevation: androidElevations[level] };
  }
  return iosShadows[level];
}

export const shadows = {
  none: getShadow("none"),
  sm: getShadow("sm"),
  md: getShadow("md"),
  lg: getShadow("lg"),
  xl: getShadow("xl"),
  "2xl": getShadow("2xl"),

  // Semantic aliases
  card: getShadow("md"),
  cardHover: getShadow("lg"),
  button: getShadow("sm"),
  buttonPressed: getShadow("none"),
  modal: getShadow("2xl"),
  dropdown: getShadow("lg"),
  toast: getShadow("xl"),
} as const;
