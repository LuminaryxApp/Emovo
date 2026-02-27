import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeContext";
import { spacing, radii } from "../../theme/spacing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionSheetItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: ActionSheetItem[];
  title?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionSheet({ visible, onClose, actions, title }: ActionSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 250 });
    }
  }, [visible, translateY, backdropOpacity]);

  const handleClose = useCallback(() => {
    translateY.value = withTiming(300, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
  }, [onClose, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        {/* Sheet */}
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }, sheetStyle]}
        >
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Title */}
          {title && (
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>{title}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={[styles.actionsGroup, { backgroundColor: colors.surface }]}>
            {actions.map((action, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  handleClose();
                  setTimeout(action.onPress, 250);
                }}
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && { backgroundColor: colors.inputBackground },
                  index === 0 && styles.actionItemFirst,
                  index === actions.length - 1 && styles.actionItemLast,
                  index < actions.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.borderLight,
                  },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={22}
                  color={action.destructive ? colors.error : colors.text}
                  style={styles.actionIcon}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    { color: colors.text },
                    action.destructive && {
                      color: colors.error,
                      fontFamily: "SourceSerif4_600SemiBold",
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Cancel */}
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.cancelButton,
              { backgroundColor: colors.surface },
              pressed && { backgroundColor: colors.inputBackground },
            ]}
          >
            <Text style={[styles.cancelLabel, { color: colors.primary }]}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    paddingHorizontal: spacing.md,
  },
  handleRow: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  titleRow: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  titleText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    color: "rgba(255,255,255,0.7)",
  },
  actionsGroup: {
    borderRadius: radii.xl,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
  },
  actionItemFirst: {
    // intentionally empty — border radius handled by parent
  },
  actionItemLast: {
    // intentionally empty
  },
  actionIcon: {
    marginRight: spacing.md,
  },
  actionLabel: {
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: radii.xl,
  },
  cancelLabel: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },
});
