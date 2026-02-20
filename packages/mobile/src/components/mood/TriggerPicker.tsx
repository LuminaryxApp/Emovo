import type { Trigger } from "@emovo/shared";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { colors } from "../../theme/colors";
import { radii } from "../../theme/spacing";
import { AnimatedPressable } from "../ui/AnimatedPressable";

// Map trigger icon names to Feather icon names
const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  briefcase: "briefcase",
  heart: "heart",
  activity: "activity",
  moon: "moon",
  dumbbell: "activity",
  "dollar-sign": "dollar-sign",
  users: "users",
  "message-circle": "message-circle",
  cloud: "cloud",
  coffee: "coffee",
};

interface TriggerPickerProps {
  triggers: Trigger[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  isLoading?: boolean;
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
        withSpring(1.08, { damping: 12, stiffness: 250 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    }
  }, [isSelected, bounceScale]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  const iconName = trigger.icon ? ICON_MAP[trigger.icon] || "tag" : "tag";

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(trigger.id);
  };

  return (
    <AnimatedPressable onPress={handleToggle} scaleDown={0.95} style={styles.chipPressable}>
      <Animated.View style={[styles.chip, isSelected && styles.chipSelected, bounceStyle]}>
        <Feather
          name={iconName}
          size={16}
          color={isSelected ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{trigger.name}</Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

export function TriggerPicker({ triggers, selectedIds, onToggle, isLoading }: TriggerPickerProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {triggers.map((trigger) => (
        <TriggerChip
          key={trigger.id}
          trigger={trigger}
          isSelected={selectedIds.includes(trigger.id)}
          onToggle={onToggle}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipPressable: {
    // Let AnimatedPressable wrap naturally
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
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    backgroundColor: "rgba(117,134,60,0.15)",
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
  loadingText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
});
