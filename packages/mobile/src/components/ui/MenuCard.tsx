import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeContext";
import { cardShadowStrong } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

import type { ActionSheetItem } from "./ActionSheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuCardProps {
  actions: ActionSheetItem[];
  onActionPress: (action: ActionSheetItem) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuCard({ actions, onActionPress, onLayout }: MenuCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]} onLayout={onLayout}>
      {actions.map((action, index) => (
        <Pressable
          key={index}
          onPress={() => onActionPress(action)}
          style={({ pressed }) => [
            styles.item,
            pressed && { backgroundColor: colors.inputBackground },
            index < actions.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.borderLight,
            },
          ]}
        >
          <Ionicons
            name={action.icon}
            size={20}
            color={action.destructive ? colors.error : colors.text}
            style={styles.icon}
          />
          <Text
            style={[
              styles.label,
              { color: colors.text },
              action.destructive && {
                color: colors.error,
                fontFamily: "SourceSerif4_600SemiBold",
              },
            ]}
            numberOfLines={1}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    overflow: "hidden",
    minWidth: 200,
    maxWidth: 280,
    ...cardShadowStrong(),
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginRight: spacing.sm + 2,
  },
  label: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    flex: 1,
  },
});
