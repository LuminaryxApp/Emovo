import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";

import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { getCurrentLanguage } from "../../src/i18n/config";
import { useAuthStore } from "../../src/stores/auth.store";
import { colors, gradients, cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii } from "../../src/theme/spacing";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      Toast.show({ type: "error", text1: t("auth.register.fillAllFields") });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({ type: "error", text1: t("auth.register.passwordsMismatch") });
      return;
    }

    if (password.length < 8) {
      Toast.show({ type: "error", text1: t("auth.register.passwordTooShort") });
      return;
    }

    try {
      await register(email.trim(), password, displayName.trim(), getCurrentLanguage());
      Toast.show({
        type: "success",
        text1: t("auth.register.accountCreated"),
        text2: t("auth.register.checkEmail"),
      });
      router.replace("/(auth)/login");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || t("auth.register.registrationFailed");
      Toast.show({ type: "error", text1: message });
    }
  };

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
            <Text style={styles.title}>{t("auth.register.title")}</Text>
            <Text style={styles.subtitle}>{t("auth.register.subtitle")}</Text>
          </View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
            <Input
              label={t("auth.register.displayName")}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t("auth.register.displayNamePlaceholder")}
              leftIcon="person-outline"
              autoCapitalize="words"
            />

            <Input
              label={t("auth.register.email")}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.register.emailPlaceholder")}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label={t("auth.register.password")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.register.passwordPlaceholder")}
              leftIcon="lock-closed-outline"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <Input
              label={t("auth.register.confirmPassword")}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("auth.register.confirmPasswordPlaceholder")}
              leftIcon="lock-closed-outline"
              secureTextEntry={!showConfirmPassword}
              rightIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            <Button
              title={
                isLoading ? t("auth.register.creatingAccount") : t("auth.register.createAccount")
              }
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              size="lg"
              fullWidth
              style={styles.createButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t("auth.register.alreadyHaveAccount")} </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={styles.footerLink} hitSlop={{ top: 8, bottom: 8 }}>
                  <Text style={styles.linkText}>{t("auth.register.signIn")}</Text>
                </TouchableOpacity>
              </Link>
            </View>
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
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textInverse,
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: 24,
    ...cardShadowStrong(),
  },
  createButton: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
    minHeight: 44,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
  },
  footerLink: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkText: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
  },
});
