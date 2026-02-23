import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";

import { useTheme } from "../../theme/ThemeContext";
import { type MoodLevel } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

const MOOD_DATA: {
  score: MoodLevel;
  emoji: string;
  label: string;
  color: string;
}[] = [
  { score: 1, emoji: "\u{1F622}", label: "Very Low", color: "#DC2626" },
  { score: 2, emoji: "\u{1F61F}", label: "Low", color: "#F97316" },
  { score: 3, emoji: "\u{1F610}", label: "Neutral", color: "#EAB308" },
  { score: 4, emoji: "\u{1F60A}", label: "Good", color: "#75863C" },
  { score: 5, emoji: "\u{1F604}", label: "Great", color: "#4A7A2E" },
];

const SIZES = {
  sm: { circle: 44, emoji: 18, emojiSelected: 22, glow: 52, label: 10 },
  md: { circle: 56, emoji: 24, emojiSelected: 28, glow: 64, label: 11 },
  lg: { circle: 72, emoji: 30, emojiSelected: 36, glow: 84, label: 12 },
} as const;

interface MoodSelectorProps {
  value?: MoodLevel;
  onChange: (level: MoodLevel) => void;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
}

interface MoodItemProps {
  mood: (typeof MOOD_DATA)[number];
  isSelected: boolean;
  onSelect: (level: MoodLevel) => void;
  showLabels: boolean;
  sizeConfig: (typeof SIZES)[keyof typeof SIZES];
}

function MoodItem({ mood, isSelected, onSelect, showLabels, sizeConfig }: MoodItemProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const bgProgress = useSharedValue(0);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.15, { damping: 12, stiffness: 200 }, () => {
        scale.value = withSpring(1.08, { damping: 14, stiffness: 180 });
      });
      glowOpacity.value = withSpring(1, { damping: 12, stiffness: 180 });
      glowScale.value = withSpring(1, { damping: 12, stiffness: 180 });
      bgProgress.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      glowOpacity.value = withSpring(0, { damping: 14, stiffness: 200 });
      glowScale.value = withSpring(0.8, { damping: 14, stiffness: 200 });
      bgProgress.value = withTiming(0, { duration: 150 });
    }
  }, [isSelected, scale, glowOpacity, glowScale, bgProgress]);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(bgProgress.value, [0, 1], [colors.surface, mood.color]),
    borderColor: interpolateColor(bgProgress.value, [0, 1], [mood.color + "60", mood.color]),
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(mood.score);
  };

  return (
    <View style={styles.moodItem}>
      <Pressable onPress={handlePress} hitSlop={8}>
        <View
          style={[
            styles.circleWrapper,
            {
              width: sizeConfig.glow + 8,
              height: sizeConfig.glow + 8,
            },
          ]}
        >
          {/* Glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                width: sizeConfig.glow,
                height: sizeConfig.glow,
                borderRadius: sizeConfig.glow / 2,
                backgroundColor: colors.moodGlow[mood.score],
              },
              glowAnimatedStyle,
            ]}
          />
          {/* Main circle */}
          <Animated.View
            style={[
              styles.circle,
              {
                width: sizeConfig.circle,
                height: sizeConfig.circle,
                borderRadius: sizeConfig.circle / 2,
              },
              circleAnimatedStyle,
            ]}
          >
            <Text
              style={{
                fontSize: isSelected ? sizeConfig.emojiSelected : sizeConfig.emoji,
              }}
            >
              {mood.emoji}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
      {showLabels && (
        <Text
          style={[
            styles.label,
            { fontSize: sizeConfig.label, color: colors.textTertiary },
            isSelected && { color: mood.color, fontFamily: "SourceSerif4_600SemiBold" },
          ]}
        >
          {mood.label}
        </Text>
      )}
    </View>
  );
}

export function MoodSelector({
  value,
  onChange,
  showLabels = true,
  size = "md",
}: MoodSelectorProps) {
  const sizeConfig = SIZES[size];

  return (
    <View style={styles.row}>
      {MOOD_DATA.map((mood) => (
        <MoodItem
          key={mood.score}
          mood={mood}
          isSelected={value === mood.score}
          onSelect={onChange}
          showLabels={showLabels}
          sizeConfig={sizeConfig}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-start",
  },
  moodItem: {
    alignItems: "center",
    flex: 1,
  },
  circleWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
  },
  circle: {
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
