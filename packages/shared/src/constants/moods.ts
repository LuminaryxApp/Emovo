export const MOOD_SCALE = [
  { score: 1, emoji: "\u{1F622}", label: "Awful", color: "#EF4444" },
  { score: 2, emoji: "\u{1F61F}", label: "Bad", color: "#F97316" },
  { score: 3, emoji: "\u{1F610}", label: "Okay", color: "#EAB308" },
  { score: 4, emoji: "\u{1F60A}", label: "Good", color: "#22C55E" },
  { score: 5, emoji: "\u{1F604}", label: "Great", color: "#10B981" },
] as const;

export const MIN_MOOD_SCORE = 1;
export const MAX_MOOD_SCORE = 5;
export const MAX_NOTE_LENGTH = 500;
