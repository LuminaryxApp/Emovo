import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { colors } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";
import { AnimatedPressable } from "../ui/AnimatedPressable";

interface Trigger {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
}

// Map common trigger icon names to Ionicons equivalents
const ICON_MAP: Record<string, string> = {
  briefcase: "briefcase-outline",
  heart: "heart-outline",
  activity: "pulse-outline",
  moon: "moon-outline",
  dumbbell: "barbell-outline",
  "dollar-sign": "cash-outline",
  users: "people-outline",
  "message-circle": "chatbubble-outline",
  cloud: "cloud-outline",
  coffee: "cafe-outline",
  book: "book-outline",
  home: "home-outline",
  music: "musical-notes-outline",
  sun: "sunny-outline",
  star: "star-outline",
  flag: "flag-outline",
  alert: "alert-circle-outline",
  smile: "happy-outline",
  frown: "sad-outline",
  zap: "flash-outline",
};

function resolveIcon(iconName: string | null): string {
  if (!iconName) return "pricetag-outline";
  return ICON_MAP[iconName] ?? (iconName.endsWith("-outline") ? iconName : `${iconName}-outline`);
}

interface TriggerChipProps {
  trigger: Trigger;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

function TriggerChip({ trigger, isSelected, onToggle }: TriggerChipProps) {
  const bounceScale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      bounceScale.value = withSequence(
        withSpring(1.1, { damping: 12, stiffness: 250 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    }
  }, [isSelected, bounceScale]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  const iconName = resolveIcon(trigger.icon);

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(trigger.id);
  }, [trigger.id, onToggle]);

  return (
    <AnimatedPressable onPress={handleToggle} scaleDown={0.95}>
      <Animated.View style={[styles.chip, isSelected && styles.chipSelected, bounceStyle]}>
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={16}
          color={isSelected ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{trigger.name}</Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

interface TriggerPickerProps {
  triggers: Trigger[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxSelections?: number;
}

export function TriggerPicker({
  triggers,
  selectedIds,
  onChange,
  maxSelections,
}: TriggerPickerProps) {
  const handleToggle = useCallback(
    (id: string) => {
      const isCurrentlySelected = selectedIds.includes(id);
      if (isCurrentlySelected) {
        onChange(selectedIds.filter((sid) => sid !== id));
      } else {
        // Respect max selections
        if (maxSelections && selectedIds.length >= maxSelections) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        }
        onChange([...selectedIds, id]);
      }
    },
    [selectedIds, onChange, maxSelections],
  );

  return (
    <View style={styles.container}>
      <View style={styles.chipGrid}>
        {triggers.map((trigger) => (
          <TriggerChip
            key={trigger.id}
            trigger={trigger}
            isSelected={selectedIds.includes(trigger.id)}
            onToggle={handleToggle}
          />
        ))}
      </View>
      {maxSelections != null && (
        <Text style={styles.counter}>
          {selectedIds.length}/{maxSelections} selected
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  counter: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "right",
  },
});
