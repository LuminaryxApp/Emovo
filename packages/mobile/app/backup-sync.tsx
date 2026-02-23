import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../src/components/ui";
import { useAuthStore } from "../src/stores/auth.store";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, screenPadding, iconSizes } from "../src/theme/spacing";

export default function BackupSyncScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();

  const lastSyncDate = user?.updatedAt
    ? new Date(user.updatedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : t("backupSync.never");

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("backupSync.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Sync status card */}
        <Card variant="elevated" padding="lg" style={styles.statusCard}>
          <Ionicons name="cloud-done-outline" size={48} color={colors.primary} />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {t("backupSync.allSynced")}
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
            {t("backupSync.lastSync", { date: lastSyncDate })}
          </Text>
        </Card>

        {/* Info items */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={iconSizes.md} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {t("backupSync.encrypted")}
              </Text>
              <Text style={[styles.infoDesc, { color: colors.textTertiary }]}>
                {t("backupSync.encryptedDesc")}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="sync-outline" size={iconSizes.md} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {t("backupSync.automatic")}
              </Text>
              <Text style={[styles.infoDesc, { color: colors.textTertiary }]}>
                {t("backupSync.automaticDesc")}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="phone-portrait-outline" size={iconSizes.md} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {t("backupSync.crossDevice")}
              </Text>
              <Text style={[styles.infoDesc, { color: colors.textTertiary }]}>
                {t("backupSync.crossDeviceDesc")}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "SourceSerif4_700Bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.lg,
  },
  statusCard: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: "SourceSerif4_700Bold",
    marginTop: spacing.sm,
  },
  statusSubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
  },
  infoSection: {
    gap: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 19,
  },
});
