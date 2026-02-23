import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../src/theme/ThemeContext";
import { spacing, radii, screenPadding, iconSizes } from "../src/theme/spacing";

// ---------------------------------------------------------------------------
// FAQ items — keyed to i18n
// ---------------------------------------------------------------------------

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FAQScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("faq.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {FAQ_KEYS.map((key, index) => {
          const isOpen = expanded === key;
          return (
            <Animated.View
              key={key}
              entering={FadeInDown.duration(400).delay(index * 60)}
              layout={Layout.springify()}
            >
              <Pressable
                style={[
                  styles.faqItem,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  isOpen && { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
                ]}
                onPress={() => toggle(key)}
              >
                <View style={styles.questionRow}>
                  <Text style={[styles.questionText, { color: colors.text }]}>
                    {t(`faq.items.${key}`)}
                  </Text>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={iconSizes.sm}
                    color={colors.textTertiary}
                  />
                </View>
                {isOpen && (
                  <Animated.View entering={FadeInDown.duration(250)}>
                    <Text
                      style={[
                        styles.answerText,
                        { color: colors.textSecondary, borderTopColor: colors.borderLight },
                      ]}
                    >
                      {t(`faq.items.${key.replace("q", "a")}`)}
                    </Text>
                  </Animated.View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "SourceSerif4_700Bold",
  },
  scrollContent: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.lg,
  },
  faqItem: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    lineHeight: 22,
  },
  answerText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 21,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
});
