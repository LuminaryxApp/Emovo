import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router, useFocusEffect } from "expo-router";
import * as StoreReview from "expo-store-review";
import { useState, useCallback, useRef } from "react";
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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, Avatar, Badge, Divider } from "../../src/components/ui";
import { VerifiedBadge } from "../../src/components/ui/VerifiedBadge";
import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguage,
  type SupportedLanguage,
} from "../../src/i18n/config";
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelDailyReminder,
} from "../../src/lib/notifications";
import { getSessionId } from "../../src/lib/secure-storage";
import { exportData } from "../../src/services/export.api";
import { getPublicProfileApi } from "../../src/services/follow.api";
import { getStreakApi, getStatsSummaryApi } from "../../src/services/stats.api";
import {
  getMeApi,
  getSessionsApi,
  deleteSessionApi,
  type Session,
} from "../../src/services/user.api";
import { useAuthStore } from "../../src/stores/auth.store";
import { useTheme, type ThemeMode } from "../../src/theme/ThemeContext";
import { cardShadowStrong } from "../../src/theme/colors";
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

const THEME_LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { mode: themeMode, setMode: setThemeMode, colors, gradients } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const logoutAll = useAuthStore((s) => s.logoutAll);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    field: "displayName" | "timezone" | "username" | "bio" | null;
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
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const setUser = useAuthStore((s) => s.setUser);

  // Refresh user data when the profile tab gains focus
  const hasMountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // Skip the initial mount — hydrate already fetched the user
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      getMeApi()
        .then((freshUser) => setUser(freshUser))
        .catch(() => {
          /* ignore — non-critical refresh */
        });
    }, [setUser]),
  );

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

  // Fetch stats every time the tab gains focus (not just once on mount)
  useFocusEffect(
    useCallback(() => {
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

        // Fetch follow counts
        try {
          if (!user?.id) return;
          const profile = await getPublicProfileApi(user.id);
          if (cancelled) return;
          setFollowerCount(profile.followerCount);
          setFollowingCount(profile.followingCount);
        } catch {
          // Non-critical
        }
      }

      fetchStats();
      return () => {
        cancelled = true;
      };
    }, [user?.id]),
  );

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

  const openEdit = (field: "displayName" | "timezone" | "username" | "bio") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let value = "";
    if (field === "displayName") value = user?.displayName || "";
    else if (field === "timezone") value = user?.timezone || "UTC";
    else if (field === "username") value = user?.username || "";
    else if (field === "bio") value = user?.bio || "";
    setEditModal({ field, value });
  };

  const handleSaveEdit = async () => {
    if (!editModal.field) return;
    // Bio can be empty (to clear it), other fields must have content
    if (editModal.field !== "bio" && !editModal.value.trim()) return;
    setIsSaving(true);
    try {
      const val = editModal.value.trim();
      await updateProfile({ [editModal.field]: editModal.field === "bio" && !val ? null : val });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModal({ field: null, value: "" });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data
        ?.error?.code;
      let msg = t("profile.failedUpdateProfile");
      if (editModal.field === "username") {
        if (status === 409 || code === "CONFLICT") msg = t("profile.usernameTaken");
        else if (code === "VALIDATION_FAILED") msg = t("profile.usernameInappropriate");
      }
      Alert.alert(t("common.error"), msg);
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
  // Theme
  // -------------------------------------------------------------------------

  const handleThemeChange = useCallback(
    async (newMode: ThemeMode) => {
      setThemeMode(newMode);
      try {
        await updateProfile({ themePreference: newMode });
      } catch {
        // Theme changed locally even if server update fails
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [setThemeMode, updateProfile],
  );

  // -------------------------------------------------------------------------
  // Avatar
  // -------------------------------------------------------------------------

  const handleChangeAvatar = useCallback(async () => {
    const options: string[] = [t("profile.changePhoto")];
    if (user?.avatarBase64) {
      options.push(t("profile.removePhoto"));
    }
    options.push(t("common.cancel"));

    Alert.alert(undefined as unknown as string, undefined as unknown as string, [
      {
        text: t("profile.changePhoto"),
        onPress: async () => {
          try {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets[0].base64) {
              await updateProfile({ avatarBase64: result.assets[0].base64 });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch {
            Alert.alert(t("common.error"), t("profile.failedUpdateProfile"));
          }
        },
      },
      ...(user?.avatarBase64
        ? [
            {
              text: t("profile.removePhoto"),
              style: "destructive" as const,
              onPress: async () => {
                try {
                  await updateProfile({ avatarBase64: null });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch {
                  Alert.alert(t("common.error"), t("profile.failedUpdateProfile"));
                }
              },
            },
          ]
        : []),
      { text: t("common.cancel"), style: "cancel" as const },
    ]);
  }, [t, user?.avatarBase64, updateProfile]);

  // -------------------------------------------------------------------------
  // Reminders
  // -------------------------------------------------------------------------

  const saveReminder = useCallback(
    async (time: string) => {
      try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
          Alert.alert(t("profile.reminders"), t("profile.reminderPermissionDenied"));
          return;
        }
        const [h, m] = time.split(":").map(Number);
        await scheduleDailyReminder(h, m);
        await updateProfile({ reminderTime: time });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert(t("common.error"), t("profile.failedUpdateProfile"));
      }
    },
    [t, updateProfile],
  );

  const handleReminderPress = useCallback(() => {
    const options: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive" | "default";
    }[] = [
      { text: "8:00 AM", onPress: () => saveReminder("08:00") },
      { text: "12:00 PM", onPress: () => saveReminder("12:00") },
      { text: "8:00 PM", onPress: () => saveReminder("20:00") },
    ];

    if (user?.reminderTime) {
      options.push({
        text: t("profile.off"),
        style: "destructive",
        onPress: () => {
          cancelDailyReminder();
          updateProfile({ reminderTime: null })
            .then(() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            })
            .catch(() => {
              Alert.alert(t("common.error"), t("profile.failedUpdateProfile"));
            });
        },
      });
    }
    options.push({ text: t("common.cancel"), style: "cancel" });

    Alert.alert(t("profile.reminders"), t("profile.reminderPickTime"), options);
  }, [user?.reminderTime, t, updateProfile, saveReminder]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ---- Profile Header Gradient ---- */}
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <Pressable onPress={handleChangeAvatar} style={styles.avatarContainer}>
              <Avatar
                name={user?.displayName || "User"}
                size="xl"
                uri={user?.avatarBase64 ? `data:image/jpeg;base64,${user.avatarBase64}` : undefined}
                style={styles.avatar}
              />
              <View style={[styles.avatarCameraOverlay, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={16} color={colors.textInverse} />
              </View>
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Text style={[styles.name, { color: colors.textInverse }]}>
                {user?.displayName || "User"}
              </Text>
              {user?.verificationTier && user.verificationTier !== "none" && (
                <VerifiedBadge tier={user.verificationTier} size="lg" />
              )}
            </View>
            {user?.username ? <Text style={styles.username}>@{user.username}</Text> : null}
            <Text style={styles.email}>{user?.email || ""}</Text>
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
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
                icon="people-outline"
                value={followerCount}
                label={t("publicProfile.followers")}
              />
              <Divider orientation="vertical" spacing={0} />
              <StatItem
                icon="person-add-outline"
                value={followingCount}
                label={t("publicProfile.followingTab")}
              />
              <Divider orientation="vertical" spacing={0} />
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
            </View>
          </Card>

          {/* ---- Account Section ---- */}
          <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
            {t("profile.sectionAccount")}
          </Text>
          <Card variant="elevated" padding="none" style={styles.sectionCard}>
            <SettingsRow
              icon="person-outline"
              label={t("profile.editProfile")}
              onPress={() => {
                Alert.alert(t("profile.editProfile"), undefined, [
                  {
                    text: t("profile.displayName"),
                    onPress: () => openEdit("displayName"),
                  },
                  {
                    text: t("profile.username"),
                    onPress: () => openEdit("username"),
                  },
                  {
                    text: t("profile.bio"),
                    onPress: () => openEdit("bio"),
                  },
                  {
                    text: t("profile.timezone"),
                    onPress: () => openEdit("timezone"),
                  },
                  { text: t("common.cancel"), style: "cancel" },
                ]);
              }}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="notifications-outline"
              label={t("profile.notifications")}
              trailing={
                <View style={{ alignSelf: "center", marginRight: spacing.xs }}>
                  <Switch
                    value={user?.notificationsEnabled ?? false}
                    onValueChange={async (val) => {
                      try {
                        await updateProfile({ notificationsEnabled: val });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {
                        Alert.alert(t("common.error"), t("profile.failedUpdateProfile"));
                      }
                    }}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                </View>
              }
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="eye-outline"
              label={t("profile.showRealName")}
              trailing={
                <View style={{ alignSelf: "center", marginRight: spacing.xs }}>
                  <Switch
                    value={user?.showRealName ?? false}
                    onValueChange={async (val) => {
                      try {
                        await updateProfile({ showRealName: val });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {
                        Alert.alert(t("common.error"), t("profile.failedUpdateProfile"));
                      }
                    }}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                </View>
              }
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="lock-closed-outline"
              label={t("profile.privateAccount")}
              trailing={
                <View style={{ alignSelf: "center", marginRight: spacing.xs }}>
                  <Switch
                    value={user?.isPrivate ?? false}
                    onValueChange={async (val) => {
                      try {
                        await updateProfile({ isPrivate: val });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {
                        Alert.alert(t("common.error"), t("profile.failedUpdateProfile"));
                      }
                    }}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                </View>
              }
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="people-outline"
              label={t("profile.followRequests")}
              onPress={() => router.push("/follow-requests")}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="shield-checkmark-outline"
              label={t("profile.privacySecurity")}
              onPress={handleOpenSessions}
            />
          </Card>

          {/* ---- Preferences Section ---- */}
          <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
            {t("profile.sectionPreferences")}
          </Text>
          <Card variant="elevated" padding="none" style={styles.sectionCard}>
            <SettingsRow
              icon="moon-outline"
              label={t("profile.darkMode")}
              value={THEME_LABELS[themeMode]}
              onPress={() => {
                Alert.alert(t("profile.darkMode"), t("profile.themePickMessage"), [
                  { text: "Light", onPress: () => handleThemeChange("light") },
                  { text: "Dark", onPress: () => handleThemeChange("dark") },
                  { text: "System", onPress: () => handleThemeChange("system") },
                  { text: t("common.cancel"), style: "cancel" },
                ]);
              }}
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
              value={user?.reminderTime ?? t("profile.off")}
              onPress={handleReminderPress}
            />
          </Card>

          {/* ---- Data Section ---- */}
          <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
            {t("profile.sectionData")}
          </Text>
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
              onPress={() => router.push("/backup-sync")}
            />
          </Card>

          {/* ---- Admin Section (only if admin) ---- */}
          {user?.isAdmin && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
                {t("profile.sectionAdmin")}
              </Text>
              <Card variant="elevated" padding="none" style={styles.sectionCard}>
                <SettingsRow
                  icon="shield-outline"
                  label={t("profile.moderation")}
                  onPress={() => router.push("/admin")}
                />
              </Card>
            </>
          )}

          {/* ---- Support Section ---- */}
          <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
            {t("profile.sectionSupport")}
          </Text>
          <Card variant="elevated" padding="none" style={styles.sectionCard}>
            <SettingsRow
              icon="help-circle-outline"
              label={t("profile.helpFaq")}
              onPress={() => router.push("/faq")}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="chatbubble-ellipses-outline"
              label={t("profile.contactUs")}
              onPress={async () => {
                const subject = encodeURIComponent("Emovo Support Request");
                const body = encodeURIComponent(
                  "Hi Emovo Team,\n\nI need help with...\n\n---\nApp Version: v0.0.1",
                );
                const url = `mailto:support@emovo.app?subject=${subject}&body=${body}`;
                try {
                  await Linking.openURL(url);
                } catch {
                  Alert.alert(t("profile.contactUs"), "support@emovo.app");
                }
              }}
            />
            <Divider spacing={0} />
            <SettingsRow
              icon="star-outline"
              label={t("profile.rateApp")}
              onPress={async () => {
                try {
                  if (await StoreReview.hasAction()) {
                    await StoreReview.requestReview();
                  }
                } catch {
                  // Silently fail — store review not available
                }
              }}
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
            <Text style={[styles.logoutText, { color: colors.error }]}>
              {isLoggingOut ? t("profile.loggingOut") : t("profile.logOut")}
            </Text>
          </Pressable>

          {/* ---- Delete Account Link ---- */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={[styles.deleteText, { color: colors.error }]}>
              {t("profile.deleteAccount")}
            </Text>
          </TouchableOpacity>

          {/* ---- Version ---- */}
          <Text style={[styles.version, { color: colors.textTertiary }]}>Emovo v0.0.1</Text>
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
          <View style={[modalStyles.container, { backgroundColor: colors.surface }]}>
            <Text style={[modalStyles.title, { color: colors.text }]}>
              {editModal.field === "displayName"
                ? t("profile.editDisplayName")
                : editModal.field === "username"
                  ? t("profile.editUsername")
                  : editModal.field === "bio"
                    ? t("profile.editBio")
                    : t("profile.editTimezone")}
            </Text>
            <TextInput
              style={[
                modalStyles.input,
                { color: colors.text, backgroundColor: colors.inputBackground },
                editModal.field === "bio" && { height: 80, textAlignVertical: "top" },
              ]}
              value={editModal.value}
              onChangeText={(v) => {
                if (editModal.field === "username") {
                  setEditModal((prev) => ({
                    ...prev,
                    value: v.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase(),
                  }));
                } else {
                  setEditModal((prev) => ({ ...prev, value: v }));
                }
              }}
              placeholder={
                editModal.field === "displayName"
                  ? t("profile.enterName")
                  : editModal.field === "username"
                    ? t("profile.enterUsername")
                    : editModal.field === "bio"
                      ? t("profile.enterBio")
                      : t("profile.timezoneExample")
              }
              autoCapitalize={editModal.field === "username" ? "none" : undefined}
              placeholderTextColor={colors.textTertiary}
              multiline={editModal.field === "bio"}
              maxLength={editModal.field === "bio" ? 500 : undefined}
              autoFocus
            />
            <View style={modalStyles.actions}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => setEditModal({ field: null, value: "" })}
              >
                <Text style={[modalStyles.cancelText, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.saveBtn,
                  { backgroundColor: colors.primary },
                  isSaving && { opacity: 0.6 },
                ]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={[modalStyles.saveText, { color: colors.textInverse }]}>
                    {t("common.save")}
                  </Text>
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
          <View
            style={[
              modalStyles.container,
              { maxHeight: "80%", padding: 0, backgroundColor: colors.surface },
            ]}
          >
            {/* Header */}
            <View style={[sessionStyles.header, { borderBottomColor: colors.divider }]}>
              <View>
                <Text style={[modalStyles.title, { color: colors.text }]}>
                  {t("profile.activeSessions")}
                </Text>
                {!sessionsLoading && sessions.length > 0 && (
                  <Text style={[sessionStyles.sessionCount, { color: colors.textTertiary }]}>
                    {sessions.length} {sessions.length === 1 ? "device" : "devices"}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSessionsVisible(false)}
                style={[sessionStyles.closeBtn, { backgroundColor: colors.inputBackground }]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {sessionsLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginVertical: spacing.xxl }}
              />
            ) : sessions.length === 0 ? (
              <View style={sessionStyles.emptyState}>
                <Ionicons name="shield-checkmark-outline" size={40} color={colors.textTertiary} />
                <Text style={[modalStyles.emptyText, { color: colors.textTertiary }]}>
                  {t("profile.noSessionsFound")}
                </Text>
              </View>
            ) : (
              <>
                <ScrollView
                  style={{ paddingHorizontal: spacing.md }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Current session first, then others */}
                  {sessions
                    .sort((a, b) => (a.current ? -1 : b.current ? 1 : 0))
                    .map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onRevoke={() => handleRevokeSession(session)}
                        t={t}
                      />
                    ))}
                </ScrollView>

                {/* Log out other devices button */}
                {sessions.filter((s) => !s.current).length > 0 && (
                  <View style={[sessionStyles.footerActions, { borderTopColor: colors.divider }]}>
                    <TouchableOpacity
                      style={[
                        sessionStyles.logoutOtherBtn,
                        {
                          backgroundColor: `${colors.error}08`,
                          borderColor: `${colors.error}20`,
                        },
                      ]}
                      onPress={() => {
                        Alert.alert(
                          t("profile.logoutOtherTitle"),
                          t("profile.logoutOtherMessage"),
                          [
                            { text: t("common.cancel"), style: "cancel" },
                            {
                              text: t("profile.logoutAllConfirm"),
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  const otherSessions = sessions.filter((s) => !s.current);
                                  await Promise.all(
                                    otherSessions.map((s) => deleteSessionApi(s.id)),
                                  );
                                  setSessions((prev) => prev.filter((s) => s.current));
                                  Haptics.notificationAsync(
                                    Haptics.NotificationFeedbackType.Success,
                                  );
                                } catch {
                                  Alert.alert(t("common.error"), t("profile.failedRevokeSession"));
                                }
                              },
                            },
                          ],
                        );
                      }}
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={18}
                        color={colors.error}
                        style={{ marginRight: spacing.xs }}
                      />
                      <Text style={[sessionStyles.logoutOtherText, { color: colors.error }]}>
                        {t("profile.logoutOtherDevices")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
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
          <View
            style={[modalStyles.container, { maxHeight: "70%", backgroundColor: colors.surface }]}
          >
            <View style={modalStyles.headerRow}>
              <Text style={[modalStyles.title, { color: colors.text }]}>
                {t("profile.selectLanguage")}
              </Text>
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
                    style={[
                      langStyles.row,
                      { borderBottomColor: colors.divider },
                      isSelected && [
                        langStyles.rowSelected,
                        { backgroundColor: `${colors.primary}10` },
                      ],
                    ]}
                    onPress={() => handleSelectLanguage(item.code)}
                    activeOpacity={0.6}
                  >
                    <View>
                      <Text
                        style={[
                          langStyles.nativeLabel,
                          { color: colors.text },
                          isSelected && [langStyles.labelSelected, { color: colors.primary }],
                        ]}
                      >
                        {item.nativeLabel}
                      </Text>
                      <Text style={[langStyles.label, { color: colors.textTertiary }]}>
                        {item.label}
                      </Text>
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
// Helpers — device detection + relative time
// ===========================================================================

function getDeviceIcon(deviceName: string | null): keyof typeof Ionicons.glyphMap {
  if (!deviceName) return "hardware-chip-outline";
  const lower = deviceName.toLowerCase();
  if (
    lower.includes("iphone") ||
    lower.includes("android") ||
    lower.includes("pixel") ||
    lower.includes("galaxy") ||
    lower.includes("phone")
  )
    return "phone-portrait-outline";
  if (lower.includes("ipad") || lower.includes("tablet")) return "tablet-portrait-outline";
  if (
    lower.includes("mac") ||
    lower.includes("windows") ||
    lower.includes("linux") ||
    lower.includes("desktop") ||
    lower.includes("pc")
  )
    return "desktop-outline";
  if (
    lower.includes("web") ||
    lower.includes("chrome") ||
    lower.includes("safari") ||
    lower.includes("firefox")
  )
    return "globe-outline";
  return "phone-portrait-outline";
}

function getRelativeTime(
  dateStr: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!dateStr) return "";
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 2) return t("profile.activeNow");
  if (diffMin < 60) return t("profile.minutesAgo", { count: diffMin });
  if (diffHrs < 24) return t("profile.hoursAgo", { count: diffHrs });
  return t("profile.daysAgo", { count: diffDays });
}

// ===========================================================================
// SessionCard — a single session in the sessions modal
// ===========================================================================

function SessionCard({
  session,
  onRevoke,
  t,
}: {
  session: Session;
  onRevoke: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { colors } = useTheme();
  const deviceIcon = getDeviceIcon(session.deviceName);
  const lastActive = getRelativeTime(session.lastUsedAt || session.createdAt, t);
  const isActiveNow = lastActive === t("profile.activeNow");

  return (
    <View
      style={[
        sessionStyles.card,
        { backgroundColor: colors.inputBackground },
        session.current && [
          sessionStyles.cardCurrent,
          { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` },
        ],
      ]}
    >
      <View style={sessionStyles.cardTop}>
        <View
          style={[
            sessionStyles.iconContainer,
            session.current
              ? [sessionStyles.iconContainerCurrent, { backgroundColor: `${colors.primary}15` }]
              : [sessionStyles.iconContainerOther, { backgroundColor: colors.surface }],
          ]}
        >
          <Ionicons
            name={deviceIcon}
            size={20}
            color={session.current ? colors.primary : colors.textSecondary}
          />
        </View>
        <View style={sessionStyles.cardInfo}>
          <View style={sessionStyles.nameRow}>
            <Text
              style={[
                sessionStyles.deviceName,
                { color: colors.text },
                session.current && [sessionStyles.deviceNameCurrent, { color: colors.primary }],
              ]}
              numberOfLines={1}
            >
              {session.deviceName || t("profile.unknownDevice")}
            </Text>
            {session.current && (
              <View
                style={[sessionStyles.currentBadge, { backgroundColor: `${colors.success}18` }]}
              >
                <View style={[sessionStyles.currentDot, { backgroundColor: colors.success }]} />
                <Text style={[sessionStyles.currentBadgeText, { color: colors.success }]}>
                  {t("profile.currentSession")}
                </Text>
              </View>
            )}
          </View>
          <View style={sessionStyles.metaRow}>
            <View style={sessionStyles.metaItem}>
              <Ionicons
                name={isActiveNow ? "radio-button-on" : "time-outline"}
                size={12}
                color={isActiveNow ? colors.success : colors.textTertiary}
              />
              <Text style={[sessionStyles.metaText, isActiveNow && { color: colors.success }]}>
                {lastActive}
              </Text>
            </View>
            {session.expiresAt && (
              <View style={sessionStyles.metaItem}>
                <Ionicons name="hourglass-outline" size={12} color={colors.textTertiary} />
                <Text style={[sessionStyles.metaText, { color: colors.textTertiary }]}>
                  {t("profile.sessionExpires", {
                    date: new Date(session.expiresAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    }),
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
        {!session.current && (
          <TouchableOpacity
            onPress={onRevoke}
            style={[sessionStyles.revokeBtn, { backgroundColor: `${colors.error}10` }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  const { colors } = useTheme();
  return (
    <View style={statStyles.item}>
      <Ionicons
        name={icon}
        size={iconSizes.sm}
        color={colors.primary}
        style={{ marginBottom: spacing.xs }}
      />
      <Text style={[statStyles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.textTertiary }]}>{label}</Text>
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
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  badge?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const _isInteractive = onPress || trailing;
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      style={settingsStyles.row}
      onPress={onPress}
      {...(onPress ? { android_ripple: { color: colors.primaryMuted } } : {})}
    >
      <Ionicons name={icon} size={iconSizes.md} color={colors.text} style={settingsStyles.icon} />
      <Text style={[settingsStyles.label, { color: colors.text }]}>{label}</Text>
      {value ? (
        <Text style={[settingsStyles.value, { color: colors.textSecondary }]}>{value}</Text>
      ) : null}
      {badge ? (
        <Badge
          variant="secondary"
          size="sm"
          style={{ marginRight: spacing.sm, alignSelf: "center" }}
        >
          {badge}
        </Badge>
      ) : null}
      {trailing || null}
      {!trailing && onPress ? (
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
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.md,
  },
  avatar: {
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarCameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  name: {
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
  },
  username: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  email: {
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: spacing.xs,
  },
  bio: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
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
    textDecorationLine: "underline",
  },

  // ---- Version ----
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
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
  },
  label: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
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
  },
  value: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
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
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
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
  },
  saveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 14,
  },
  saveText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    marginVertical: spacing.xl,
  },
});

const sessionStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  sessionCount: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  cardCurrent: {
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerCurrent: {},
  iconContainerOther: {},
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  deviceName: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    flexShrink: 1,
  },
  deviceNameCurrent: {},
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    gap: 4,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  currentBadgeText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
  },
  revokeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  footerActions: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  logoutOtherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  logoutOtherText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
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
    borderRadius: 12,
  },
  rowSelected: {},
  nativeLabel: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  labelSelected: {},
  label: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 2,
  },
});
