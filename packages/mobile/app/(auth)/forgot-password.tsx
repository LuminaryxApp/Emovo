import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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
} from "react-native";
import Toast from "react-native-toast-message";

import { forgotPasswordApi } from "../../src/services/auth.api";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Toast.show({ type: "error", text1: "Please enter your email" });
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
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather name="mail" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.description}>
              If an account exists for {email}, we've sent password reset instructions.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.description}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
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

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{isLoading ? "Sending..." : "Send Reset Link"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Text style={styles.backText}>Back to Sign In</Text>
          </TouchableOpacity>
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

  // --- Header ---
  header: {
    marginBottom: 80,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    lineHeight: 22,
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

  // --- Back link ---
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: spacing.md,
  },
  backText: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
  },
});
