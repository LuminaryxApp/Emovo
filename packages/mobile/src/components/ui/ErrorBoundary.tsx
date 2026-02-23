import { Ionicons } from "@expo/vector-icons";
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";

interface ErrorFallbackProps {
  onRetry: () => void;
}

function ErrorFallback({ onRetry }: ErrorFallbackProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <Text style={[styles.title, { color: colors.text }]}>{t("errors.somethingWrong")}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {t("errors.unexpectedError")}
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={onRetry}
      >
        <Ionicons name="refresh-outline" size={16} color={colors.textInverse} />
        <Text style={[styles.buttonText, { color: colors.textInverse }]}>
          {t("common.tryAgain")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontFamily: "SourceSerif4_700Bold",
    marginTop: spacing.md,
  },
  message: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xl,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },
});
