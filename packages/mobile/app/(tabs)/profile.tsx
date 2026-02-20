import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSessionId } from "../../src/lib/secure-storage";
import { exportData } from "../../src/services/export.api";
import { getSessionsApi, deleteSessionApi, type Session } from "../../src/services/user.api";
import { useAuthStore } from "../../src/stores/auth.store";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

export default function ProfileScreen() {
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

  const displayInitial = (user?.displayName || "U").charAt(0).toUpperCase();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Error", "Failed to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Log out all devices?", "This will sign you out from all devices.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out All",
        style: "destructive",
        onPress: async () => {
          try {
            await logoutAll();
            router.replace("/(auth)/login");
          } catch {
            Alert.alert("Error", "Failed to log out. Please try again.");
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
      Alert.alert("Error", "Failed to update profile.");
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
      Alert.alert("Error", "Failed to load sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const handleOpenSessions = () => {
    setSessionsVisible(true);
    loadSessions();
  };

  const handleRevokeSession = (session: Session) => {
    if (session.current) {
      Alert.alert("Cannot revoke", "This is your current session. Use log out instead.");
      return;
    }
    Alert.alert("Revoke session?", `Remove "${session.deviceName || "Unknown device"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSessionApi(session.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
          } catch {
            Alert.alert("Error", "Failed to revoke session.");
          }
        },
      },
    ]);
  };

  const handleExport = (format: "json" | "csv") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Export Data", `Export your mood data as ${format.toUpperCase()}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Export",
        onPress: async () => {
          setIsExporting(true);
          try {
            await exportData(format);
          } catch {
            Alert.alert("Error", "Failed to export data.");
          } finally {
            setIsExporting(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(
      "Delete Account?",
      "This will permanently delete your account and all associated data:\n\n" +
        "\u2022 All mood entries and notes\n" +
        "\u2022 All custom triggers\n" +
        "\u2022 All session data\n\n" +
        "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            Alert.alert("Are you absolutely sure?", "Type DELETE to confirm account deletion.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Yes, Delete Everything",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteAccount();
                    router.replace("/(auth)/login");
                  } catch {
                    Alert.alert("Error", "Failed to delete account.");
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayInitial}</Text>
            </View>
            <Text style={styles.name}>{user?.displayName || "User"}</Text>
            <Text style={styles.email}>{user?.email || ""}</Text>
          </View>

          {/* ACCOUNT Section */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              label="Display Name"
              value={user?.displayName || ""}
              onPress={() => openEdit("displayName")}
              showDivider
            />
            <SettingsRow label="Email" value={user?.email || ""} showDivider />
            <SettingsRow
              label="Timezone"
              value={user?.timezone || "UTC"}
              onPress={() => openEdit("timezone")}
            />
          </View>

          {/* DATA Section */}
          <Text style={styles.sectionLabel}>DATA</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              label="Export as JSON"
              value={isExporting ? "Exporting..." : undefined}
              onPress={() => handleExport("json")}
              showDivider
            />
            <SettingsRow
              label="Export as CSV"
              value={isExporting ? "Exporting..." : undefined}
              onPress={() => handleExport("csv")}
            />
          </View>

          {/* SECURITY Section */}
          <Text style={styles.sectionLabel}>SECURITY</Text>
          <View style={styles.sectionCard}>
            <SettingsRow label="Active Sessions" onPress={handleOpenSessions} showDivider />
            <SettingsRow label="Log out all devices" onPress={handleLogoutAll} />
          </View>

          {/* DANGER ZONE */}
          <Text style={[styles.sectionLabel, { color: colors.error }]}>DANGER ZONE</Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>{isLoggingOut ? "Logging out..." : "Log Out"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>

          <Text style={styles.version}>v0.1.0</Text>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Modal */}
      <Modal
        visible={editModal.field !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModal({ field: null, value: "" })}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>
              {editModal.field === "displayName" ? "Edit Display Name" : "Edit Timezone"}
            </Text>
            <TextInput
              style={modalStyles.input}
              value={editModal.value}
              onChangeText={(v) => setEditModal((prev) => ({ ...prev, value: v }))}
              placeholder={
                editModal.field === "displayName" ? "Enter your name" : "e.g. America/New_York"
              }
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={modalStyles.actions}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => setEditModal({ field: null, value: "" })}
              >
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={modalStyles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sessions Modal */}
      <Modal
        visible={sessionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSessionsVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { maxHeight: "70%" }]}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Active Sessions</Text>
              <TouchableOpacity onPress={() => setSessionsVisible(false)}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {sessionsLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginVertical: spacing.xl }}
              />
            ) : sessions.length === 0 ? (
              <Text style={modalStyles.emptyText}>No active sessions found.</Text>
            ) : (
              <ScrollView style={{ marginTop: spacing.md }}>
                {sessions.map((session) => (
                  <View key={session.id} style={sessionStyles.row}>
                    <Feather
                      name="smartphone"
                      size={18}
                      color={session.current ? colors.primary : colors.textTertiary}
                    />
                    <View style={sessionStyles.info}>
                      <Text style={sessionStyles.deviceName}>
                        {session.deviceName || "Unknown Device"}
                        {session.current ? " (Current)" : ""}
                      </Text>
                      <Text style={sessionStyles.lastUsed}>
                        {session.lastUsedAt
                          ? `Last active ${new Date(session.lastUsedAt).toLocaleDateString()}`
                          : `Created ${new Date(session.createdAt).toLocaleDateString()}`}
                      </Text>
                    </View>
                    {!session.current && (
                      <TouchableOpacity onPress={() => handleRevokeSession(session)}>
                        <Feather name="x-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// --- Settings Row Component ---

function SettingsRow({
  label,
  value,
  onPress,
  showDivider,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  showDivider?: boolean;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <>
      <Wrapper
        style={settingsStyles.row}
        onPress={onPress}
        {...(onPress ? { activeOpacity: 0.6 } : {})}
      >
        <Text style={settingsStyles.label}>{label}</Text>
        <View style={settingsStyles.rightSide}>
          {value ? <Text style={settingsStyles.value}>{value}</Text> : null}
          {onPress && (
            <Feather
              name="chevron-right"
              size={16}
              color={colors.textTertiary}
              style={{ marginLeft: spacing.sm }}
            />
          )}
        </View>
      </Wrapper>
      {showDivider && <View style={settingsStyles.divider} />}
    </>
  );
}

// --- Styles ---

const cardShadow = Platform.select({
  ios: {
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  android: {
    elevation: 2,
  },
  default: {},
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    alignItems: "center",
    paddingTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.textInverse,
  },
  name: {
    fontSize: 22,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
  },
  email: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    letterSpacing: 1.5,
    color: colors.sectionLabel,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: spacing.lg,
    ...cardShadow,
  },

  // Destructive actions
  logoutButton: {
    height: 52,
    backgroundColor: colors.errorLight,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.error,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: spacing.md,
  },
  deleteText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.error,
  },

  // Version
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: spacing.xl,
  },
});

const settingsStyles = StyleSheet.create({
  row: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },
  value: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: spacing.md,
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
    borderRadius: 20,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 340,
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
