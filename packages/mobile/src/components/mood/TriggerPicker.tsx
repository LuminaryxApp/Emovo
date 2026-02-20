import type { Trigger } from "@emovo/shared";
import { Feather } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { colors } from "../../theme/colors";

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
      {triggers.map((trigger) => {
        const isSelected = selectedIds.includes(trigger.id);
        const iconName = trigger.icon ? ICON_MAP[trigger.icon] || "tag" : "tag";

        return (
          <TouchableOpacity
            key={trigger.id}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onToggle(trigger.id)}
            activeOpacity={0.7}
          >
            <Feather
              name={iconName}
              size={14}
              color={isSelected ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {trigger.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
});
