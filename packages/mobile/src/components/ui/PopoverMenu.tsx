import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, LayoutChangeEvent, Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ActionSheetItem } from "./ActionSheet";
import { MenuCard } from "./MenuCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnchorPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PopoverMenuProps {
  visible: boolean;
  onClose: () => void;
  actions: ActionSheetItem[];
  /** Trigger element position from ref.measureInWindow() */
  anchorPosition: AnchorPosition | null;
  /** Preferred placement relative to anchor. Default: "below" */
  placement?: "above" | "below";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };
const MENU_GAP = 8;

// ---------------------------------------------------------------------------
// Position calculation
// ---------------------------------------------------------------------------

function computePosition(
  anchor: AnchorPosition,
  menuSize: { width: number; height: number },
  screen: { width: number; height: number },
  insets: { top: number; bottom: number },
  preferred: "above" | "below",
) {
  const spaceBelow = screen.height - (anchor.y + anchor.height + MENU_GAP) - insets.bottom;
  const spaceAbove = anchor.y - MENU_GAP - insets.top;

  let placement = preferred;
  if (placement === "below" && spaceBelow < menuSize.height && spaceAbove > menuSize.height) {
    placement = "above";
  } else if (
    placement === "above" &&
    spaceAbove < menuSize.height &&
    spaceBelow > menuSize.height
  ) {
    placement = "below";
  }

  const top =
    placement === "below"
      ? anchor.y + anchor.height + MENU_GAP
      : anchor.y - menuSize.height - MENU_GAP;

  // Horizontal: align right edge with anchor right edge, clamped within screen
  let left = anchor.x + anchor.width - menuSize.width;
  left = Math.max(MENU_GAP, Math.min(left, screen.width - menuSize.width - MENU_GAP));

  // Clamp vertical within safe area
  const clampedTop = Math.max(
    insets.top + MENU_GAP,
    Math.min(top, screen.height - insets.bottom - menuSize.height - MENU_GAP),
  );

  return { top: clampedTop, left, placement };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PopoverMenu({
  visible,
  onClose,
  actions,
  anchorPosition,
  placement: preferredPlacement = "below",
}: PopoverMenuProps) {
  const insets = useSafeAreaInsets();
  const [menuSize, setMenuSize] = useState<{ width: number; height: number } | null>(null);

  // Animation values
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 200 });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    }
  }, [visible, scale, opacity, backdropOpacity]);

  const handleClose = useCallback(() => {
    scale.value = withTiming(0.85, { duration: 150 });
    opacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
  }, [onClose, scale, opacity, backdropOpacity]);

  const handleActionPress = useCallback(
    (action: ActionSheetItem) => {
      handleClose();
      setTimeout(action.onPress, 200);
    },
    [handleClose],
  );

  const onMenuLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMenuSize((prev) => {
      if (prev && prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  // Animated styles
  const menuAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible || !anchorPosition) return null;

  const screen = Dimensions.get("window");
  const position =
    menuSize && anchorPosition
      ? computePosition(anchorPosition, menuSize, screen, insets, preferredPlacement)
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View style={[styles.backdrop, backdropAnimStyle]} />
        </Pressable>

        {/* Hidden measurement ghost */}
        {!menuSize && (
          <View style={styles.measureGhost}>
            <MenuCard actions={actions} onActionPress={() => {}} onLayout={onMenuLayout} />
          </View>
        )}

        {/* Positioned menu */}
        {menuSize && position && (
          <Animated.View
            style={[styles.menuWrapper, { top: position.top, left: position.left }, menuAnimStyle]}
          >
            <MenuCard actions={actions} onActionPress={handleActionPress} />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  measureGhost: {
    position: "absolute",
    opacity: 0,
    top: -9999,
    left: -9999,
  },
  menuWrapper: {
    position: "absolute",
  },
});
