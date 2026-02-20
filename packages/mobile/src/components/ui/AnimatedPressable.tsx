import * as Haptics from "expo-haptics";
import { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

interface AnimatedPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  scaleDown?: number;
  haptic?: boolean;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
  activeOpacity?: number;
}

export function AnimatedPressable({
  onPress,
  onLongPress,
  scaleDown = 0.97,
  haptic = false,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  disabled = false,
  style,
  children,
  testID,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(scaleDown, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(hapticStyle);
    }
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      testID={testID}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
