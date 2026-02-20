import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import Toast from "react-native-toast-message";

import { useAuthStore } from "../../src/stores/auth.store";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const iconImage = require("../../assets/icon.png");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Toast.show({ type: "error", text1: "Please fill in all fields" });
      return;
    }

    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || "Login failed. Please try again.";
      Toast.show({ type: "error", text1: message });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={iconImage} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.logo}>Emovo</Text>
          <Text style={styles.subtitle}>Track your emotional well-being</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Your password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{isLoading ? "Signing in..." : "Sign In"}</Text>
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.forgotButton} hitSlop={{ top: 8, bottom: 8 }}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7}>
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },

  // --- Logo section ---
  header: {
    alignItems: "center",
    marginBottom: 80,
  },
  logoImage: {
    width: 72,
    height: 72,
    marginBottom: spacing.sm,
  },
  logo: {
    fontSize: 40,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // --- Form ---
  form: {},
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    height: 52,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },

  // --- Password field ---
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },
  eyeButton: {
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },

  // --- Primary button ---
  button: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // --- Forgot link ---
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

  // --- Divider ---
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
  },

  // --- Secondary button ---
  secondaryButton: {
    height: 52,
    backgroundColor: colors.primaryMuted,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },
});
