import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { useTheme } from "./ThemeContext";
import type { ThemeColors } from "./colors";

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (
  colors: ThemeColors,
  isDark: boolean,
) => T;

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: StyleFactory<T>): T {
  const { colors, isDark } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors, isDark)), [colors, isDark, factory]);
}
