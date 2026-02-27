/**
 * Shared constants for group creation and editing.
 */

export const GROUP_EMOJIS = [
  "\u{1F33F}",
  "\u{1F331}",
  "\u{1F308}",
  "\u{1F33B}",
  "\u{1F30A}",
  "\u{1F343}",
  "\u{1F9D8}",
  "\u{1F4AA}",
  "\u{1F3AF}",
  "\u{1F3C3}",
  "\u{1F9E0}",
  "\u{1F4A1}",
  "\u{1F4AC}",
  "\u{2764}\u{FE0F}",
  "\u{1F91D}",
  "\u{1FAC2}",
  "\u{1F4AD}",
  "\u{2728}",
  "\u{1F4DA}",
  "\u{1F3A8}",
  "\u{1F3B5}",
  "\u{1F4DD}",
  "\u{1F52C}",
  "\u{1F30D}",
] as const;

export interface GradientPreset {
  start: string;
  end: string;
  label: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { start: "#75863C", end: "#8FA04E", label: "Forest" },
  { start: "#6F98B8", end: "#5A7E9E", label: "Ocean" },
  { start: "#8B5CF6", end: "#6D28D9", label: "Purple" },
  { start: "#F59E0B", end: "#D97706", label: "Amber" },
  { start: "#EC4899", end: "#BE185D", label: "Rose" },
  { start: "#10B981", end: "#059669", label: "Emerald" },
  { start: "#3B82F6", end: "#1D4ED8", label: "Blue" },
  { start: "#000000", end: "#374151", label: "Dark" },
];
