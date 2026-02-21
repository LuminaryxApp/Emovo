export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./shadows";
export * from "./animations";

import { MoodLevel } from "./colors";

export const moodLabels: Record<MoodLevel, string> = {
  1: "Very Low",
  2: "Low",
  3: "Neutral",
  4: "Good",
  5: "Great",
};

export const moodEmojis: Record<MoodLevel, string> = {
  1: "\u{1F622}",
  2: "\u{1F614}",
  3: "\u{1F610}",
  4: "\u{1F60A}",
  5: "\u{1F604}",
};

export function getMoodColor(level: MoodLevel): string {
  const moodColors: Record<MoodLevel, string> = {
    1: "#DC2626",
    2: "#F97316",
    3: "#EAB308",
    4: "#75863C",
    5: "#4A7A2E",
  };
  return moodColors[level];
}

export function getMoodBgColor(level: MoodLevel): string {
  const moodBgColors: Record<MoodLevel, string> = {
    1: "rgba(220, 38, 38, 0.12)",
    2: "rgba(249, 115, 22, 0.12)",
    3: "rgba(234, 179, 8, 0.12)",
    4: "rgba(117, 134, 60, 0.12)",
    5: "rgba(74, 122, 46, 0.12)",
  };
  return moodBgColors[level];
}

export function getMoodGradient(level: MoodLevel): [string, string] {
  const gradientMap: Record<MoodLevel, [string, string]> = {
    1: ["#DC2626", "#EF4444"],
    2: ["#F97316", "#FB923C"],
    3: ["#EAB308", "#FACC15"],
    4: ["#75863C", "#8FA04E"],
    5: ["#4A7A2E", "#5C9A3A"],
  };
  return gradientMap[level];
}

export type { MoodLevel };
