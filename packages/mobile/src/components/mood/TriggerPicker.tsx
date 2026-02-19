import type { Trigger } from "@emovo/shared";
import { Feather } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

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
        <Text style={styles.label}>What triggered this mood?</Text>
        <Text style={styles.loadingText}>Loading triggers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>What triggered this mood?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
                color={isSelected ? colors.textInverse : colors.primary}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {trigger.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 18,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.primary,
  },
  chipTextSelected: {
    color: colors.textInverse,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
});
