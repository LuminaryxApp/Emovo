import { View, Text, StyleSheet } from "react-native";
import type { BaseToastProps } from "react-native-toast-message";

import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";

const ICON_MAP = {
  success: "\u2714",
  error: "\u2716",
  info: "\u2139",
};

function ToastBase({
  text1,
  text2,
  type,
}: BaseToastProps & { type: "success" | "error" | "info" }) {
  const { colors } = useTheme();
  const accentColor =
    type === "success" ? colors.success : type === "error" ? colors.error : colors.info;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderLeftColor: accentColor }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: accentColor }]}>
        <Text style={[styles.icon, { color: colors.textInverse }]}>{ICON_MAP[type]}</Text>
      </View>
      <View style={styles.textContainer}>
        {text1 ? (
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => <ToastBase {...props} type="success" />,
  error: (props: BaseToastProps) => <ToastBase {...props} type="error" />,
  info: (props: BaseToastProps) => <ToastBase {...props} type="info" />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 4,
  },
  icon: {
    fontSize: 14,
    fontWeight: "700",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: "SourceSerif4_600SemiBold",
    fontSize: 15,
    marginBottom: 2,
  },
  message: {
    fontFamily: "SourceSerif4_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
