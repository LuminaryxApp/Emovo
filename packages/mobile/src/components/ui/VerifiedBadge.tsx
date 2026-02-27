import type { VerificationTier } from "@emovo/shared";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";

interface VerifiedBadgeProps {
  tier: VerificationTier;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: 14, md: 16, lg: 20 } as const;

// Brand-unique colors (not Twitter/X copies):
// Verified → Emovo brand blue #6F98B8
// Official → Emovo brand green #75863C
const COLORS = {
  verified: "#6F98B8",
  official: "#75863C",
} as const;

export function VerifiedBadge({ tier, size = "md" }: VerifiedBadgeProps) {
  if (tier === "none") return null;

  const iconSize = SIZES[size];
  const color = COLORS[tier];

  return (
    <MaterialCommunityIcons
      name="check-decagram"
      size={iconSize}
      color={color}
      style={{ marginLeft: 4 }}
    />
  );
}
