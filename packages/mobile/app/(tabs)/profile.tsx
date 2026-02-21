import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, Avatar, Badge, Divider } from "../../src/components/ui";
import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguage,
  type SupportedLanguage,
} from "../../src/i18n/config";
import { getSessionId } from "../../src/lib/secure-storage";
import { exportData } from "../../src/services/export.api";
import { getStreakApi, getStatsSummaryApi } from "../../src/services/stats.api";
import { getSessionsApi, deleteSessionApi, type Session } from "../../src/services/user.api";
import { useAuthStore } from "../../src/stores/auth.store";
import { colors, gradients, cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii, screenPadding, iconSizes } from "../../src/theme/spacing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const logoutAll = useAuthStore((s) => s.logoutAll);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    field: "displayName" | "timezone" | null;
    value: string;
  }>({ field: null, value: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsVisible, setSessionsVisible] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Language modal state
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Stats state
  const [streak, setStreak] = useState<StreakInfo>({
    currentStreak: 0,
    longestStreak: 0,
    lastLogDate: null,
  });
  const [entryCount, setEntryCount] = useState(0);

  const currentLangCode = getCurrentLanguage();
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode);
  const currentLangLabel = currentLangObj?.nativeLabel || "English";

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "";

  // -------------------------------------------------------------------------
  // Fetch stats on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const [streakData, summaryData] = await Promise.all([
          getStreakApi(),
          getStatsSummaryApi({ period: "year" }),
        ]);
        if (cancelled) return;
        setStreak({
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          lastLogDate: streakData.lastLogDate,
        });
        setEntryCount(summaryData.entryCount ?? 0);
      } catch {
        // Silently fail — stats are non-critical
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Handlers (all preserved from original)
  // -------------------------------------------------------------------------

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch {
      Alert.alert(t("common.error"), t("profile.failedLogout"));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const _handleLogoutAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t("profile.logoutAllTitle"), t("profile.logoutAllMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logoutAllConfirm"),
        style: "destructive",
        onPress: async () => {
          try {
            await logoutAll();
            router.replace("/(auth)/login");
          } catch {
            Alert.alert(t("common.error"), t("profile.failedLogout"));
          }
        },
      },
    ]);
  };

  const openEdit = (field: "displayName" | "timezone") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const value = field === "displayName" ? user?.displayName || "" : user?.timezone || "UTC";
    setEditModal({ field, value });
  };

  const handleSaveEdit = async () => {
    if (!editModal.field || !editModal.value.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile({ [editModal.field]: editModal.value.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModal({ field: null, value: "" });
    } catch {
      Alert.alert(t("common.error"), t("profile.failedUpdateProfile"));
    } finally {
      setIsSaving(false);
    }
  };

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const sessionId = await getSessionId();
      const data = await getSessionsApi(sessionId || undefined);
      setSessions(data);
    } catch {
      Alert.alert(t("common.error"), t("profile.failedLoadSessions"));
    } finally {
      setSessionsLoading(false);
    }
  }, [t]);

  const handleOpenSessions = () => {
    setSessionsVisible(true);
    loadSessions();
  };

  const handleRevokeSession = (session: Session) => {
    if (session.current) {
      Alert.alert(t("profile.cannotRevoke"), t("profile.cannotRevokeMessage"));
      return;
    }
    Alert.alert(
      t("profile.revokeSessionTitle"),
      t("profile.revokeSessionMessage", {
        deviceName: session.deviceName || t("profile.unknownDevice"),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSessionApi(session.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSessions((prev) => prev.filter((s) => s.id !== session.id));
            } catch {
              Alert.alert(t("common.error"), t("profile.failedRevokeSession"));
            }
          },
        },
      ],
    );
  };

  const _handleExport = (format: "json" | "csv") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t("profile.exportDataTitle"),
      t("profile.exportDataMessage", { format: format.toUpperCase() }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.export"),
          onPress: async () => {
            setIsExporting(true);
            try {
              await exportData(format);
            } catch {
              Alert.alert(t("common.error"), t("profile.failedExport"));
            } finally {
              setIsExporting(false);
            }
          },
        },
      ],
    );
  };

  const handleSelectLanguage = async (lang: SupportedLanguage) => {
    setLanguageModalVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await changeLanguage(lang);
    try {
      await updateProfile({ preferredLanguage: lang });
    } catch {
      // Language changed locally even if server update fails
    }
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(t("profile.deleteAccountTitle"), t("profile.deleteAccountMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.deleteAccount"),
        style: "destructive",
        onPress: () => {
          Alert.alert(
            t("profile.deleteAccountConfirmTitle"),
            t("profile.deleteAccountConfirmMessage"),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("profile.deleteAccountConfirmButton"),
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteAccount();
                    router.replace("/(auth)/login");
                  } catch {
                    Alert.alert(t("common.error"), t("profile.failedDeleteAccount"));
                  }
                },
              },
            ],
          );
        },
      },
    ]);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ---- Profile Header Gradient ---- */}
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <Avatar name={user?.displayName || "User"} size="xl" style={styles.avatar} />
            <Text style={styles.name}>{user?.displayName || "User"}</Text>
            <Text style={styles.email}>{user?.email || ""}</Text>
            {joinDate ? (
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>{`Member since ${joinDate}`}</Text>
              </View>
            ) : null}
          </LinearGradient>

          {/* ---- Stats Row (overlaps gradient) ---- */}
          <Card variant="elevated" padding="md" style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatItem
                icon="create-outline"
                value={entryCount}
                label={t("profile.totalEntries")}
              />
              <Divider orientation="vertical" spacing={0} />
              <StatItem
                icon="flame-outline"
                value={streak.currentStreak}
                label={t("profile.currentStreak")}
              />
              <Divider orientation="vertical" spacing={0} />
              <StatItem
                icon="trophy-outline"
                value={streak.longestStreak}
                label={t("profile.longestStreak")}
              />
            </View>
          </Card>

          {/* ---- Account Section ---- */}
          <Text style={styles.sectionLabel}>{t("profile.sectionAccount")}</Text>
          <Card variant="elevated" padding="none" style={styles.sectionCard}>
            <SettingsRow
              icon="person-outline"
              label={t("profile.editProfile")}
              onPress={() => openEdit("displayName")}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="notifications-outline"
              label={t("profile.notifications")}
              badge={t("profile.soon")}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="shield-checkmark-outline"
              label={t("profile.privacySecurity")}
              onPress={handleOpenSessions}
            />
          </Card>

          {/* ---- Preferences Section ---- */}
          <Text style={styles.sectionLabel}>{t("profile.sectionPreferences")}</Text>
          <Card variant="elevated" padding="none" style={styles.sectionCard}>
            <SettingsRow
              icon="moon-outline"
              label={t("profile.darkMode")}
              badge={t("profile.soon")}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="globe-outline"
              label={t("profile.language")}
              value={currentLangLabel}
              onPress={() => setLanguageModalVisible(true)}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="alarm-outline"
              label={t("profile.reminders")}
              badge={t("profile.soon")}
            />
          </Card>

          {/* ---- Data Section ---- */}
          <Text style={styles.sectionLabel}>{t("profile.sectionData")}</Text>
          <Card variant="elevated" padding="none" style={styles.sectionCard}>
            <SettingsRow
              icon="download-outline"
              label={t("profile.exportData")}
              value={isExporting ? t("profile.exporting") : undefined}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(t("profile.exportDataTitle"), t("profile.exportFormatMessage"), [
                  { text: t("common.cancel"), style: "cancel" },
                  {
                    text: "JSON",
                    onPress: async () => {
                      setIsExporting(true);
                      try {
                        await exportData("json");
                      } catch {
                        Alert.alert(t("common.error"), t("profile.failedExport"));
                      } finally {
                        setIsExporting(false);
                      }
                    },
                  },
                  {
                    text: "CSV",
                    onPress: async () => {
                      setIsExporting(true);
                      try {
                        await exportData("csv");
                      } catch {
                        Alert.alert(t("common.error"), t("profile.failedExport"));
                      } finally {
                        setIsExporting(false);
                      }
                    },
                  },
                ]);
              }}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="cloud-upload-outline"
              label={t("profile.backupSync")}
              badge={t("profile.soon")}
            />
          </Card>

          {/* ---- Support Section ---- */}
          <Text style={styles.sectionLabel}>{t("profile.sectionSupport")}</Text>
          <Card variant="elevated" padding="none" style={styles.sectionCard}>
            <SettingsRow
              icon="help-circle-outline"
              label={t("profile.helpFaq")}
              badge={t("profile.soon")}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="chatbubble-ellipses-outline"
              label={t("profile.contactUs")}
              badge={t("profile.soon")}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="star-outline"
              label={t("profile.rateApp")}
              badge={t("profile.soon")}
            />
          </Card>

          {/* ---- Logout Row ---- */}
          <Pressable style={styles.logoutRow} onPress={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <ActivityIndicator
                size="small"
                color={colors.error}
                style={{ marginRight: spacing.sm }}
              />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={iconSizes.md}
                color={colors.error}
                style={{ marginRight: spacing.sm }}
              />
            )}
            <Text style={styles.logoutText}>
              {isLoggingOut ? t("profile.loggingOut") : t("profile.logOut")}
            </Text>
          </Pressable>

          {/* ---- Delete Account Link ---- */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteText}>{t("profile.deleteAccount")}</Text>
          </TouchableOpacity>

          {/* ---- Version ---- */}
          <Text style={styles.version}>Emovo v0.0.1</Text>
        </ScrollView>
      </SafeAreaView>

      {/* ================================================================= */}
      {/* Edit Modal                                                        */}
      {/* ================================================================= */}
      <Modal
        visible={editModal.field !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModal({ field: null, value: "" })}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>
              {editModal.field === "displayName"
                ? t("profile.editDisplayName")
                : t("profile.editTimezone")}
            </Text>
            <TextInput
              style={modalStyles.input}
              value={editModal.value}
              onChangeText={(v) => setEditModal((prev) => ({ ...prev, value: v }))}
              placeholder={
                editModal.field === "displayName"
                  ? t("profile.enterName")
                  : t("profile.timezoneExample")
              }
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={modalStyles.actions}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => setEditModal({ field: null, value: "" })}
              >
                <Text style={modalStyles.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={modalStyles.saveText}>{t("common.save")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* Sessions Modal                                                    */}
      {/* ================================================================= */}
      <Modal
        visible={sessionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSessionsVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { maxHeight: "70%" }]}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>{t("profile.activeSessions")}</Text>
              <TouchableOpacity onPress={() => setSessionsVisible(false)}>
                <Ionicons name="close-outline" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {sessionsLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginVertical: spacing.xl }}
              />
            ) : sessions.length === 0 ? (
              <Text style={modalStyles.emptyText}>{t("profile.noSessionsFound")}</Text>
            ) : (
              <ScrollView style={{ marginTop: spacing.md }}>
                {sessions.map((session) => (
                  <View key={session.id} style={sessionStyles.row}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={18}
                      color={session.current ? colors.primary : colors.textTertiary}
                    />
                    <View style={sessionStyles.info}>
                      <Text style={sessionStyles.deviceName}>
                        {session.deviceName || t("profile.unknownDevice")}
                        {session.current ? ` ${t("profile.currentSession")}` : ""}
                      </Text>
                      <Text style={sessionStyles.lastUsed}>
                        {session.lastUsedAt
                          ? t("profile.lastActive", {
                              date: new Date(session.lastUsedAt).toLocaleDateString(),
                            })
                          : t("profile.created", {
                              date: new Date(session.createdAt).toLocaleDateString(),
                            })}
                      </Text>
                    </View>
                    {!session.current && (
                      <TouchableOpacity onPress={() => handleRevokeSession(session)}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* Language Selector Modal                                           */}
      {/* ================================================================= */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { maxHeight: "70%" }]}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>{t("profile.selectLanguage")}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Ionicons name="close-outline" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              style={{ marginTop: spacing.md }}
              renderItem={({ item }) => {
                const isSelected = item.code === currentLangCode;
                return (
                  <TouchableOpacity
                    style={[langStyles.row, isSelected && langStyles.rowSelected]}
                    onPress={() => handleSelectLanguage(item.code)}
                    activeOpacity={0.6}
                  >
                    <View>
                      <Text
                        style={[langStyles.nativeLabel, isSelected && langStyles.labelSelected]}
                      >
                        {item.nativeLabel}
                      </Text>
                      <Text style={langStyles.label}>{item.label}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-outline" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ===========================================================================
// StatItem — used inside the stats card
// ===========================================================================

function StatItem({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={statStyles.item}>
      <Ionicons
        name={icon}
        size={iconSizes.sm}
        color={colors.primary}
        style={{ marginBottom: spacing.xs }}
      />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

// ===========================================================================
// SettingsRow — a single pressable row inside a settings card
// ===========================================================================

function SettingsRow({
  icon,
  label,
  value,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  badge?: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      style={settingsStyles.row}
      onPress={onPress}
      {...(onPress ? { android_ripple: { color: colors.primaryMuted } } : {})}
    >
      <Ionicons name={icon} size={iconSizes.md} color={colors.text} style={settingsStyles.icon} />
      <Text style={settingsStyles.label}>{label}</Text>
      {value ? <Text style={settingsStyles.value}>{value}</Text> : null}
      {badge ? (
        <Badge
          variant="secondary"
          size="sm"
          style={{ marginRight: spacing.sm, alignSelf: "center" }}
        >
          {badge}
        </Badge>
      ) : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={iconSizes.xs} color={colors.textTertiary} />
      ) : null}
    </Wrapper>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl + spacing.xl,
  },

  // ---- Header Gradient ----
  headerGradient: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl + spacing.md,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatar: {
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  name: {
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.textInverse,
  },
  email: {
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: spacing.xs,
  },
  memberBadge: {
    marginTop: spacing.sm,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  memberBadgeText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: "rgba(255, 255, 255, 0.90)",
  },

  // ---- Stats Card ----
  statsCard: {
    marginTop: -spacing.xl,
    marginHorizontal: screenPadding.horizontal,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    minHeight: 80,
  },

  // ---- Section ----
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    letterSpacing: 1.5,
    color: colors.sectionLabel,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginLeft: screenPadding.horizontal + spacing.xs,
    marginRight: screenPadding.horizontal,
  },
  sectionCard: {
    marginHorizontal: screenPadding.horizontal,
    marginBottom: spacing.lg,
  },

  // ---- Logout Row ----
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    marginHorizontal: screenPadding.horizontal,
    marginTop: spacing.sm,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.error,
  },

  // ---- Delete Account ----
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    marginHorizontal: screenPadding.horizontal,
  },
  deleteText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.error,
    textDecorationLine: "underline",
  },

  // ---- Version ----
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: spacing.lg,
  },
});

const statStyles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  value: {
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
  },
  label: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: "center",
  },
});

const settingsStyles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginRight: spacing.md,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },
  value: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 340,
    ...cardShadowStrong(),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    backgroundColor: colors.inputBackground,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 14,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 14,
  },
  saveText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textInverse,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "center",
    marginVertical: spacing.xl,
  },
});

const sessionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  info: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
  },
  lastUsed: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: 2,
  },
});

const langStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    borderRadius: 12,
  },
  rowSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  nativeLabel: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
  },
  labelSelected: {
    color: colors.primary,
  },
  label: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: 2,
  },
});
