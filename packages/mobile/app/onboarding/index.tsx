import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, Dimensions, Animated, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, gradients } from "../../src/theme/colors";
import { spacing, radii } from "../../src/theme/spacing";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_KEY = "hasSeenOnboarding";

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  gradient: readonly [string, string];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    icon: "leaf",
    title: "Track Your Mood",
    description: "Log how you feel throughout the day with our simple 5-point scale",
    gradient: gradients.greetingCard,
  },
  {
    id: "2",
    icon: "analytics",
    title: "Discover Patterns",
    description: "Understand what influences your emotional well-being with insights",
    gradient: ["#6F98B8", "#8BB0C9"] as const,
  },
  {
    id: "3",
    icon: "trending-up",
    title: "Grow & Thrive",
    description: "Build healthy habits and watch your emotional wellness flourish",
    gradient: ["#4A7A2E", "#5C9A3A"] as const,
  },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<Animated.FlatList<(typeof SLIDES)[number]>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(auth)/login");
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleComplete();
    }
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {!isLastSlide && (
        <Pressable style={styles.skipButton} onPress={handleComplete}>
          <Text style={styles.skipText}>{t("onboarding.skip", "Skip")}</Text>
        </Pressable>
      )}

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item, index }) => <SlideItem slide={item} index={index} scrollX={scrollX} />}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      />

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <PaginationDot key={i} index={i} currentIndex={currentIndex} />
          ))}
        </View>

        <Pressable onPress={handleNext}>
          <LinearGradient
            colors={[...gradients.primaryButton]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>
              {isLastSlide
                ? t("onboarding.getStarted", "Get Started")
                : t("onboarding.next", "Next")}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function SlideItem({
  slide,
  index,
  scrollX,
}: {
  slide: OnboardingSlide;
  index: number;
  scrollX: Animated.Value;
}) {
  const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.8, 1, 0.8],
    extrapolate: "clamp",
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.5, 1, 0.5],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.slideContent, { transform: [{ scale }], opacity }]}>
        <LinearGradient colors={[...slide.gradient]} style={styles.iconContainer}>
          <Ionicons name={slide.icon} size={48} color={colors.surface} />
        </LinearGradient>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideDescription}>{slide.description}</Text>
      </Animated.View>
    </View>
  );
}

function PaginationDot({ index, currentIndex }: { index: number; currentIndex: number }) {
  const isActive = index === currentIndex;
  const widthAnim = useRef(new Animated.Value(isActive ? 24 : 8)).current;

  React.useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: isActive ? 24 : 8,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [isActive, widthAnim]);

  return <Animated.View style={[styles.dot, isActive && styles.dotActive, { width: widthAnim }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: "absolute",
    top: 64,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 14,
    color: colors.textSecondary,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  slideContent: {
    alignItems: "center",
    gap: spacing.lg,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  slideTitle: {
    fontFamily: "SourceSerif4_700Bold",
    fontSize: 36,
    color: colors.text,
    textAlign: "center",
  },
  slideDescription: {
    fontFamily: "SourceSerif4_400Regular",
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 28,
  },
  bottomSection: {
    paddingHorizontal: spacing.md,
    gap: spacing.xl,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  nextButton: {
    height: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 16,
    color: colors.textInverse,
  },
});
