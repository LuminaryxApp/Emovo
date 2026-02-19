import { Feather } from "@expo/vector-icons";
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

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

      return (
        <View style={styles.container}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>An unexpected error occurred. Please try again.</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Feather name="refresh-cw" size={16} color={colors.textInverse} />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    marginTop: spacing.md,
  },
  message: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xl,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textInverse,
  },
});
