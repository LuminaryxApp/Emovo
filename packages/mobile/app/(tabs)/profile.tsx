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
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSessionId } from "../../src/lib/secure-storage";
import { exportData } from "../../src/services/export.api";
import { getSessionsApi, deleteSessionApi, type Session } from "../../src/services/user.api";
import { useAuthStore } from "../../src/stores/auth.store";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const iconImage = require("../../assets/icon.png");

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
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
        "• All mood entries and notes\n" +
        "• All custom triggers\n" +
        "• All session data\n\n" +
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
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <Image source={iconImage} style={styles.avatar} resizeMode="contain" />
          <Text style={styles.name}>{user?.displayName || "User"}</Text>
          <Text style={styles.email}>{user?.email || ""}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingsRow
            icon="user"
            label="Display Name"
            value={user?.displayName || ""}
            onPress={() => openEdit("displayName")}
          />
          <SettingsRow icon="mail" label="Email" value={user?.email || ""} />
          <SettingsRow
            icon="globe"
            label="Timezone"
            value={user?.timezone || "UTC"}
            onPress={() => openEdit("timezone")}
          />
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <SettingsRow
            icon="download"
            label="Export as JSON"
            value={isExporting ? "Exporting..." : ""}
            onPress={() => handleExport("json")}
          />
          <SettingsRow
            icon="download"
            label="Export as CSV"
            value={isExporting ? "Exporting..." : ""}
            onPress={() => handleExport("csv")}
          />
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <SettingsRow
            icon="smartphone"
            label="Active Sessions"
            value={`${sessions.length || "View"}`}
            onPress={handleOpenSessions}
          />
          <SettingsRow icon="shield" label="Log out all devices" onPress={handleLogoutAll} />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <Feather name="log-out" size={18} color={colors.error} />
          <Text style={styles.logoutText}>{isLoggingOut ? "Logging out..." : "Log Out"}</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Feather name="trash-2" size={16} color={colors.error} />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Emovo v0.1.0</Text>
      </ScrollView>

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

function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={settingsStyles.row} onPress={onPress}>
      <Feather name={icon} size={20} color={colors.primary} />
      <View style={settingsStyles.textContainer}>
        <Text style={settingsStyles.label}>{label}</Text>
        {value ? <Text style={settingsStyles.value}>{value}</Text> : null}
      </View>
      {onPress && <Feather name="chevron-right" size={18} color={colors.textTertiary} />}
    </Wrapper>
  );
}

const sessionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.md,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    backgroundColor: colors.background,
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
    borderRadius: 10,
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
    borderRadius: 10,
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

const settingsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
  },
  value: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing.md,
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
    marginTop: 4,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.error,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  deleteText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.error,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: spacing.xl,
  },
});
