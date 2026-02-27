import type { VerificationTier } from "@emovo/shared";
import { BadgeCheck } from "lucide-react";

const TIER_CONFIG = {
  verified: { color: "text-[#6F98B8]" },
  official: { color: "text-brand-green" },
} as const;

interface VerifiedBadgeProps {
  tier: VerificationTier;
  size?: number;
}

export function VerifiedBadge({ tier, size = 14 }: VerifiedBadgeProps) {
  if (tier === "none") return null;
  const config = TIER_CONFIG[tier];
  return <BadgeCheck size={size} className={`inline-block shrink-0 ${config.color}`} />;
}
