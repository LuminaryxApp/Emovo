import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";

import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { resetPasswordApi } from "../../src/services/auth.api";
import { useTheme } from "../../src/theme/ThemeContext";
import { cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii } from "../../src/theme/spacing";

export default function ResetPasswordScreen() {
  const { colors, gradients } = useTheme();
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      Toast.show({ type: "error", text1: t("auth.resetPassword.invalidLink") });
      return;
    }

    if (password.length < 8) {
      Toast.show({ type: "error", text1: t("auth.resetPassword.minLength") });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({ type: "error", text1: t("auth.resetPassword.mismatch") });
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordApi(token, password);
      setSuccess(true);
    } catch {
      Toast.show({
        type: "error",
        text1: t("auth.resetPassword.error"),
        text2: t("auth.resetPassword.errorDescription"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
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
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={styles.sentContent}>
              <View style={[styles.iconCircle, { backgroundColor: colors.error + "20" }]}>
                <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
              </View>
              <Text style={[styles.sentTitle, { color: colors.text }]}>
                {t("auth.resetPassword.invalidLink")}
              </Text>
              <Text style={[styles.sentDescription, { color: colors.textSecondary }]}>
                {t("auth.resetPassword.invalidLinkDescription")}
              </Text>
            </View>
            <Button
              title={t("auth.resetPassword.requestNew")}
              onPress={() => router.replace("/(auth)/forgot-password")}
              size="lg"
              fullWidth
            />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (success) {
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
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={styles.sentContent}>
              <LinearGradient
                colors={[...gradients.primaryButton]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Ionicons name="checkmark-circle-outline" size={28} color={colors.textInverse} />
              </LinearGradient>
              <Text style={[styles.sentTitle, { color: colors.text }]}>
                {t("auth.resetPassword.successTitle")}
              </Text>
              <Text style={[styles.sentDescription, { color: colors.textSecondary }]}>
                {t("auth.resetPassword.successDescription")}
              </Text>
            </View>
            <Button
              title={t("auth.resetPassword.signIn")}
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
            <Text style={[styles.title, { color: colors.textInverse }]}>
              {t("auth.resetPassword.title")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textInverse }]}>
              {t("auth.resetPassword.description")}
            </Text>
          </View>

          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <Input
              label={t("auth.resetPassword.newPassword")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
              leftIcon="lock-closed-outline"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <Input
              label={t("auth.resetPassword.confirmPassword")}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
              leftIcon="lock-closed-outline"
              secureTextEntry
            />

            <Button
              title={
                isLoading ? t("auth.resetPassword.resetting") : t("auth.resetPassword.resetButton")
              }
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              size="lg"
              fullWidth
              style={styles.submitButton}
            />

            <Button
              title={t("auth.resetPassword.backToSignIn")}
              onPress={() => router.replace("/(auth)/login")}
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
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 22,
    opacity: 0.9,
  },
  card: {
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
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  sentDescription: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 22,
    textAlign: "center",
  },
});
