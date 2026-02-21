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
  Image,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";

import { Button } from "../../src/components/ui/Button";
import { Divider } from "../../src/components/ui/Divider";
import { Input } from "../../src/components/ui/Input";
import { useAuthStore } from "../../src/stores/auth.store";
import { colors, gradients, cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii } from "../../src/theme/spacing";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const iconImage = require("../../assets/icon.png");

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Toast.show({ type: "error", text1: t("auth.login.fillAllFields") });
      return;
    }

    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || t("auth.login.loginFailed");
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
            <Image source={iconImage} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.logo}>Emovo</Text>
            <Text style={styles.subtitle}>{t("auth.login.subtitle")}</Text>
          </View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
            <Input
              label={t("auth.login.email")}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.login.emailPlaceholder")}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label={t("auth.login.password")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.login.passwordPlaceholder")}
              leftIcon="lock-closed-outline"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <Button
              title={t("auth.login.signIn")}
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              size="lg"
              fullWidth
              style={styles.signInButton}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotButton} hitSlop={{ top: 8, bottom: 8 }}>
                <Text style={styles.forgotText}>{t("auth.login.forgotPassword")}</Text>
              </TouchableOpacity>
            </Link>

            <Divider label={t("common.or")} spacing={spacing.md} />

            <Button
              title={t("auth.login.createAccount")}
              onPress={() => router.push("/(auth)/register")}
              variant="secondary"
              size="lg"
              fullWidth
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
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 72,
    height: 72,
    marginBottom: spacing.sm,
  },
  logo: {
    fontSize: 40,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.textInverse,
    letterSpacing: -1,
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
  signInButton: {
    marginTop: spacing.xs,
  },
  forgotButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: spacing.xs,
  },
  forgotText: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
  },
});
