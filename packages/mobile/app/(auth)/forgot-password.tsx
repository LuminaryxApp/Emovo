import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";

import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { forgotPasswordApi } from "../../src/services/auth.api";
import { colors, gradients, cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii } from "../../src/theme/spacing";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Toast.show({ type: "error", text1: t("auth.forgotPassword.enterEmail") });
      return;
    }

    setIsLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      setSent(true);
    } catch {
      // Always show success (anti-enumeration)
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <LinearGradient
        colors={[...gradients.authHeader]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
            <View style={styles.sentContent}>
              <LinearGradient
                colors={[...gradients.primaryButton]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Ionicons name="mail-outline" size={28} color={colors.textInverse} />
              </LinearGradient>
              <Text style={styles.sentTitle}>{t("auth.forgotPassword.checkEmail")}</Text>
              <Text style={styles.sentDescription}>
                {t("auth.forgotPassword.emailSentDescription", { email })}
              </Text>
            </View>

            <Button
              title={t("auth.forgotPassword.backToSignIn")}
              onPress={() => router.replace("/(auth)/login")}
              size="lg"
              fullWidth
            />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[...gradients.authHeader]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.6 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("auth.forgotPassword.title")}</Text>
            <Text style={styles.subtitle}>{t("auth.forgotPassword.description")}</Text>
          </View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
            <Input
              label={t("auth.forgotPassword.email")}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.forgotPassword.emailPlaceholder")}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Button
              title={
                isLoading
                  ? t("auth.forgotPassword.sending")
                  : t("auth.forgotPassword.sendResetLink")
              }
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              size="lg"
              fullWidth
              style={styles.submitButton}
            />

            <Button
              title={t("auth.forgotPassword.backToSignIn")}
              onPress={() => router.back()}
              variant="ghost"
              size="md"
              fullWidth
              style={styles.backButton}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: 32,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.textInverse,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textInverse,
    lineHeight: 22,
    opacity: 0.9,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: 24,
    ...cardShadowStrong(),
  },
  submitButton: {
    marginTop: spacing.xs,
  },
  backButton: {
    marginTop: spacing.sm,
  },
  sentContent: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  sentTitle: {
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  sentDescription: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: "center",
  },
});
