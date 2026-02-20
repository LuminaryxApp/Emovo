import { MOOD_SCALE } from "@emovo/shared";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { colors } from "../../theme/colors";

interface MoodSelectorProps {
  selectedScore: number | null;
  onSelect: (score: number) => void;
}

interface MoodItemProps {
  mood: (typeof MOOD_SCALE)[number];
  isSelected: boolean;
  onSelect: (score: number) => void;
}

function MoodItem({ mood, isSelected, onSelect }: MoodItemProps) {
  const scale = useSharedValue(1);
  const glowScale = useSharedValue(0);

  useEffect(() => {
    if (isSelected) {
      // Spring up then settle at slightly enlarged
      scale.value = withSpring(1.12, { damping: 12, stiffness: 200 }, () => {
        scale.value = withSpring(1.05, { damping: 14, stiffness: 180 });
      });
      glowScale.value = withSpring(1, { damping: 12, stiffness: 180 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      glowScale.value = withSpring(0, { damping: 14, stiffness: 200 });
    }
  }, [isSelected, scale, glowScale]);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowScale.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(mood.score);
  };

  return (
    <View style={styles.moodItem}>
      <Pressable onPress={handlePress}>
        <View style={styles.circleWrapper}>
          {/* Glow ring behind circle */}
          <Animated.View
            style={[
              styles.glowRing,
              { backgroundColor: colors.moodGlow[mood.score] },
              glowAnimatedStyle,
            ]}
          />
          {/* Main circle */}
          <Animated.View
            style={[
              styles.circle,
              { borderColor: mood.color },
              isSelected && {
                backgroundColor: mood.color,
                width: 72,
                height: 72,
                borderRadius: 36,
              },
              circleAnimatedStyle,
            ]}
          >
            <Text style={[styles.emoji, isSelected && styles.emojiSelected]}>{mood.emoji}</Text>
          </Animated.View>
        </View>
      </Pressable>
      <Text style={[styles.label, isSelected && { color: mood.color }]}>{mood.label}</Text>
    </View>
  );
}

export function MoodSelector({ selectedScore, onSelect }: MoodSelectorProps) {
  return (
    <View style={styles.row}>
      {MOOD_SCALE.map((mood) => (
        <MoodItem
          key={mood.score}
          mood={mood}
          isSelected={selectedScore === mood.score}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  moodItem: {
    alignItems: "center",
  },
  circleWrapper: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  circle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 28,
  },
  emojiSelected: {
    fontSize: 34,
  },
  label: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: 6,
  },
});
