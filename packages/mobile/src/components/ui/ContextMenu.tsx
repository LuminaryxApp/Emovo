import * as Haptics from "expo-haptics";
import React, { ReactNode, useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
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

interface ContextMenuProps {
  actions: ActionSheetItem[];
  children: ReactNode;
  /** Whether long-press is enabled. Default: true */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
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
  content: { x: number; y: number; width: number; height: number },
  menuSize: { width: number; height: number },
  screen: { width: number; height: number },
  insets: { top: number; bottom: number },
) {
  const spaceBelow = screen.height - (content.y + content.height + MENU_GAP) - insets.bottom;
  const _spaceAbove = content.y - MENU_GAP - insets.top;

  const placement = spaceBelow >= menuSize.height ? "below" : "above";
  const top =
    placement === "below"
      ? content.y + content.height + MENU_GAP
      : content.y - menuSize.height - MENU_GAP;

  // Horizontal: center on content, clamped within screen
  let left = content.x + content.width / 2 - menuSize.width / 2;
  left = Math.max(MENU_GAP, Math.min(left, screen.width - menuSize.width - MENU_GAP));

  // Clamp vertical within safe area
  const clampedTop = Math.max(
    insets.top + MENU_GAP,
    Math.min(top, screen.height - insets.bottom - menuSize.height - MENU_GAP),
  );

  return { top: clampedTop, left };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContextMenu({ actions, children, enabled = true, style }: ContextMenuProps) {
  const insets = useSafeAreaInsets();
  const contentRef = useRef<View>(null);

  const [visible, setVisible] = useState(false);
  const [contentPosition, setContentPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [menuSize, setMenuSize] = useState<{ width: number; height: number } | null>(null);

  // Animation values
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const openMenu = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withTiming(1, { duration: 200 });
    backdropOpacity.value = withTiming(1, { duration: 250 });
  }, [scale, opacity, backdropOpacity]);

  const handleLongPress = useCallback(() => {
    if (!enabled || actions.length === 0) return;

    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    contentRef.current?.measureInWindow((x, y, width, height) => {
      setContentPosition({ x, y, width, height });
      setMenuSize(null); // reset so measurement ghost appears
      setVisible(true);
      // Animation will start after menu size is measured
    });
  }, [enabled, actions]);

  const handleClose = useCallback(() => {
    scale.value = withTiming(0.85, { duration: 150 });
    opacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
      }
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
  }, [scale, opacity, backdropOpacity]);

  const handleActionPress = useCallback(
    (action: ActionSheetItem) => {
      handleClose();
      setTimeout(action.onPress, 200);
    },
    [handleClose],
  );

  const onMenuLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setMenuSize((prev) => {
        if (prev && prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
      // Now that we have the size, animate in
      requestAnimationFrame(() => openMenu());
    },
    [openMenu],
  );

  // Animated styles
  const menuAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const screen = Dimensions.get("window");
  const position =
    menuSize && contentPosition ? computePosition(contentPosition, menuSize, screen, insets) : null;

  return (
    <>
      <Pressable onLongPress={handleLongPress} delayLongPress={400}>
        <View ref={contentRef} collapsable={false} style={style}>
          {children}
        </View>
      </Pressable>

      {visible && (
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
                style={[
                  styles.menuWrapper,
                  { top: position.top, left: position.left },
                  menuAnimStyle,
                ]}
              >
                <MenuCard actions={actions} onActionPress={handleActionPress} />
              </Animated.View>
            )}
          </View>
        </Modal>
      )}
    </>
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
