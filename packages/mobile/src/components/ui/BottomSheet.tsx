import React, { ReactNode, useCallback, useEffect, useMemo } from "react";
import {
  BackHandler,
  Dimensions,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Snap point heights in pixels. Defaults to [300]. Last value is max height. */
  snapPoints?: number[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DISMISS_THRESHOLD = 100; // px below lowest snap to dismiss
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BottomSheet({
  visible,
  onClose,
  children,
  snapPoints: snapPointsProp,
  style,
  testID,
}: BottomSheetProps) {
  const snapPoints = useMemo(
    () => (snapPointsProp && snapPointsProp.length > 0 ? snapPointsProp : [300]),
    [snapPointsProp],
  );

  // translateY: 0 = fully visible at lowest snap, SCREEN_HEIGHT = off screen
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const activeSnapIndex = useSharedValue(0);

  // Lowest snap = smallest height => largest translateY offset from top
  // We convert snap point heights to translateY values (distance from bottom of screen)
  const snapTranslateValues = useMemo(
    () => snapPoints.map((h) => SCREEN_HEIGHT - h).sort((a, b) => b - a),
    [snapPoints],
  );

  const lowestSnap = snapTranslateValues[0]; // largest translateY (smallest sheet)

  // Open / close
  useEffect(() => {
    if (visible) {
      // Animate in to the first (lowest) snap point
      translateY.value = withSpring(lowestSnap, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 250 });
      activeSnapIndex.value = 0;
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, lowestSnap, translateY, backdropOpacity, activeSnapIndex]);

  // Android back button
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  const dismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  // Find nearest snap point
  const findNearestSnap = useCallback(
    (y: number) => {
      let nearest = snapTranslateValues[0];
      let minDist = Math.abs(y - nearest);
      for (let i = 1; i < snapTranslateValues.length; i++) {
        const dist = Math.abs(y - snapTranslateValues[i]);
        if (dist < minDist) {
          minDist = dist;
          nearest = snapTranslateValues[i];
        }
      }
      return nearest;
    },
    [snapTranslateValues],
  );

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newY = lowestSnap + event.translationY;
      // Allow dragging down freely, but cap upward drag at highest snap
      const highestSnap = snapTranslateValues[snapTranslateValues.length - 1];
      translateY.value = Math.max(highestSnap, newY);
    })
    .onEnd((event) => {
      const currentY = translateY.value;

      // If dragged below dismiss threshold, close
      if (currentY > lowestSnap + DISMISS_THRESHOLD) {
        translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
        backdropOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(dismiss)();
        return;
      }

      // Snap velocity-aware: if flicking down fast, dismiss
      if (event.velocityY > 1500) {
        translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
        backdropOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(dismiss)();
        return;
      }

      // Snap to nearest
      const nearest = findNearestSnap(currentY);
      translateY.value = withSpring(nearest, SPRING_CONFIG);
    });

  // Animated styles
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(backdropOpacity.value, [0, 1], [0, 0.5]),
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer} testID={testID}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
        </Pressable>

        {/* Sheet */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, style, sheetAnimatedStyle]}>
            {/* Drag handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Content */}
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    ...cardShadow(),
    // Extra shadow for the sheet
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
