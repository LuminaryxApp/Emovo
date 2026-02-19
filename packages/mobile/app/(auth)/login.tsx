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
            >
              <Text style={styles.eyeIcon}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? "Signing in..." : "Sign In"}</Text>
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.secondaryButton}>
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
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: spacing.sm,
  },
  logo: {
    fontSize: 40,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },
  eyeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  eyeIcon: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.accent,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  linkButton: {
    alignItems: "center",
    marginTop: spacing.sm,
  },
  linkText: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },
});
