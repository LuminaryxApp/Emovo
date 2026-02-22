import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/colors";
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
// Component
// ---------------------------------------------------------------------------

export function ActionSheet({ visible, onClose, actions, title }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

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
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </Pressable>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing.md },
            { transform: [{ translateY: slideAnim }] },
          ]}
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
          <View style={styles.actionsGroup}>
            {actions.map((action, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  handleClose();
                  setTimeout(action.onPress, 250);
                }}
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                  index === 0 && styles.actionItemFirst,
                  index === actions.length - 1 && styles.actionItemLast,
                  index < actions.length - 1 && styles.actionItemBorder,
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={22}
                  color={action.destructive ? colors.error : colors.text}
                  style={styles.actionIcon}
                />
                <Text
                  style={[styles.actionLabel, action.destructive && styles.actionLabelDestructive]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Cancel */}
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
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
    backgroundColor: colors.surface,
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
  actionItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  actionItemPressed: {
    backgroundColor: colors.inputBackground,
  },
  actionIcon: {
    marginRight: spacing.md,
  },
  actionLabel: {
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },
  actionLabelDestructive: {
    color: colors.error,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
  },
  cancelButtonPressed: {
    backgroundColor: colors.inputBackground,
  },
  cancelLabel: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.primary,
  },
});
