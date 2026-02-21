export const typography = {
  display: {
    fontSize: 48,
    fontWeight: "700" as const,
    fontFamily: "SourceSerif4_700Bold",
    letterSpacing: -1,
  },
  heroScore: {
    fontSize: 56,
    fontWeight: "700" as const,
    fontFamily: "SourceSerif4_700Bold",
    letterSpacing: -2,
  },
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    fontFamily: "SourceSerif4_700Bold",
  },
  h2: {
    fontSize: 24,
    fontWeight: "700" as const,
    fontFamily: "SourceSerif4_700Bold",
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    fontFamily: "SourceSerif4_400Regular",
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
    fontFamily: "SourceSerif4_400Regular",
  },
  small: {
    fontSize: 12,
    fontWeight: "400" as const,
    fontFamily: "SourceSerif4_400Regular",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    fontFamily: "SourceSerif4_600SemiBold",
    letterSpacing: 1.5,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  statLarge: {
    fontSize: 36,
    fontWeight: "700" as const,
    fontFamily: "SourceSerif4_700Bold",
  },
  statMedium: {
    fontSize: 24,
    fontWeight: "600" as const,
    fontFamily: "SourceSerif4_600SemiBold",
  },
} as const;

export const fontFamilies = {
  heading: "SourceSerif4_600SemiBold",
  headingLight: "SourceSerif4_400Regular",
  body: "SourceSerif4_400Regular",
  bodyMedium: "SourceSerif4_600SemiBold",
  bodySemiBold: "SourceSerif4_700Bold",
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
} as const;

export const lineHeights = {
  tight: 1.2,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const letterSpacing = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

export const textStyles = {
  h1: {
    fontFamily: "SourceSerif4_700Bold",
    fontSize: 36,
    lineHeight: 36 * 1.2,
    fontWeight: "700" as const,
    letterSpacing: -0.25,
  },
  h2: {
    fontFamily: "SourceSerif4_700Bold",
    fontSize: 30,
    lineHeight: 30 * 1.2,
    fontWeight: "700" as const,
    letterSpacing: -0.25,
  },
  h3: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 24,
    lineHeight: 24 * 1.375,
    fontWeight: "600" as const,
  },
  h4: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 20,
    lineHeight: 20 * 1.375,
    fontWeight: "600" as const,
  },
  bodyLarge: {
    fontFamily: "SourceSerif4_400Regular",
    fontSize: 18,
    lineHeight: 18 * 1.625,
    fontWeight: "400" as const,
  },
  body: {
    fontFamily: "SourceSerif4_400Regular",
    fontSize: 16,
    lineHeight: 16 * 1.5,
    fontWeight: "400" as const,
  },
  bodySmall: {
    fontFamily: "SourceSerif4_400Regular",
    fontSize: 14,
    lineHeight: 14 * 1.5,
    fontWeight: "400" as const,
  },
  label: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 14,
    lineHeight: 14 * 1.5,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 12,
    lineHeight: 12 * 1.5,
    fontWeight: "500" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  caption: {
    fontFamily: "SourceSerif4_400Regular",
    fontSize: 12,
    lineHeight: 12 * 1.5,
    fontWeight: "400" as const,
  },
  button: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 16,
    lineHeight: 16 * 1.2,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 14,
    lineHeight: 14 * 1.2,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
} as const;
