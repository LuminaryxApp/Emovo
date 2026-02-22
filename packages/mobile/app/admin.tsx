import type { ReportWithContext } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge, Card, ActionSheet, type ActionSheetItem } from "../src/components/ui";
import {
  listReportsApi,
  resolveReportApi,
  getReportStatsApi,
  unbanUserApi,
} from "../src/services/moderation.api";
import { colors } from "../src/theme/colors";
import { spacing, radii, screenPadding } from "../src/theme/spacing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const REASON_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  spam: "mail-outline",
  harassment: "hand-left-outline",
  hate_speech: "megaphone-outline",
  self_harm: "heart-outline",
  misinformation: "alert-circle-outline",
  inappropriate: "eye-off-outline",
  other: "ellipsis-horizontal-outline",
};

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning,
  reviewed: colors.info ?? colors.primary,
  actioned: colors.error,
  dismissed: colors.textTertiary,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reports, setReports] = useState<ReportWithContext[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | undefined>("pending");

  // Action sheet
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionSheetItems, setActionSheetItems] = useState<ActionSheetItem[]>([]);
  const [actionSheetTitle, setActionSheetTitle] = useState("");

  // Suspend days prompt
  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [suspendDays, setSuspendDays] = useState("7");
  const [suspendReportId, setSuspendReportId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const loadStats = useCallback(async () => {
    try {
      const stats = await getReportStatsApi();
      setPendingCount(stats.pending);
    } catch {
      // Silent
    }
  }, []);

  const loadReports = useCallback(
    async (reset = true) => {
      if (reset) setIsLoading(true);
      try {
        const result = await listReportsApi({
          status: statusFilter,
          limit: 20,
          cursor: reset ? undefined : (cursor ?? undefined),
        });
        if (reset) {
          setReports(result.reports);
        } else {
          setReports((prev) => [...prev, ...result.reports]);
        }
        setCursor(result.cursor);
      } catch {
        Alert.alert(t("common.error"), t("admin.loadError"));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, cursor, t],
  );

  useEffect(() => {
    loadReports(true);
    loadStats();
  }, [statusFilter, loadReports, loadStats]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadReports(true);
    loadStats();
  }, [loadReports, loadStats]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleResolve = useCallback(
    async (
      reportId: string,
      status: string,
      actionTaken: string,
      extraFields?: { adminNote?: string; suspendDays?: number },
    ) => {
      try {
        await resolveReportApi(reportId, {
          status,
          actionTaken,
          ...extraFields,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Refresh
        loadReports(true);
        loadStats();
      } catch {
        Alert.alert(t("common.error"), t("admin.actionError"));
      }
    },
    [loadReports, loadStats, t],
  );

  const _handleUnban = useCallback(
    async (userId: string) => {
      try {
        await unbanUserApi(userId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t("admin.userUnbanned"));
      } catch {
        Alert.alert(t("common.error"), t("admin.actionError"));
      }
    },
    [t],
  );

  const handleReportPress = useCallback(
    (report: ReportWithContext) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (report.status !== "pending") {
        // Already resolved — show info only
        Alert.alert(
          t("admin.reportResolved"),
          `${t("admin.action")}: ${report.actionTaken ?? "none"}\n${t("admin.note")}: ${report.adminNote ?? "-"}`,
        );
        return;
      }

      const items: ActionSheetItem[] = [
        {
          label: t("admin.dismiss"),
          icon: "close-circle-outline",
          onPress: () => handleResolve(report.id, "dismissed", "none"),
        },
        {
          label: t("admin.removeContent"),
          icon: "trash-outline",
          destructive: true,
          onPress: () => {
            Alert.alert(t("admin.confirmRemove"), t("admin.confirmRemoveMessage"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("admin.removeContent"),
                style: "destructive",
                onPress: () => handleResolve(report.id, "actioned", "content_removed"),
              },
            ]);
          },
        },
        {
          label: t("admin.suspendUser"),
          icon: "time-outline",
          onPress: () => {
            setSuspendReportId(report.id);
            setSuspendDays("7");
            setSuspendModalVisible(true);
          },
        },
        {
          label: t("admin.banUser"),
          icon: "ban-outline",
          destructive: true,
          onPress: () => {
            Alert.alert(t("admin.confirmBan"), t("admin.confirmBanMessage"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("admin.banUser"),
                style: "destructive",
                onPress: () => handleResolve(report.id, "actioned", "user_banned"),
              },
            ]);
          },
        },
      ];

      setActionSheetTitle(t("admin.takeAction"));
      setActionSheetItems(items);
      setActionSheetVisible(true);
    },
    [handleResolve, t],
  );

  const handleSubmitSuspend = useCallback(() => {
    if (!suspendReportId) return;
    const days = parseInt(suspendDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      Alert.alert(t("common.error"), t("admin.invalidDays"));
      return;
    }
    setSuspendModalVisible(false);
    handleResolve(suspendReportId, "actioned", "user_suspended", {
      suspendDays: days,
    });
  }, [suspendReportId, suspendDays, handleResolve, t]);

  // -------------------------------------------------------------------------
  // Filter tabs
  // -------------------------------------------------------------------------

  const filters = [
    { key: "pending", label: t("admin.pending") },
    { key: undefined, label: t("admin.all") },
    { key: "actioned", label: t("admin.actioned") },
    { key: "dismissed", label: t("admin.dismissed") },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("admin.title")}</Text>
        <View style={styles.backButton}>
          {pendingCount > 0 && (
            <Badge variant="error" size="sm">
              {pendingCount.toString()}
            </Badge>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => {
          const isActive = statusFilter === f.key;
          return (
            <Pressable
              key={f.key ?? "all"}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Reports list */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t("admin.noReports")}</Text>
            <Text style={styles.emptySubtitle}>{t("admin.noReportsMessage")}</Text>
          </View>
        ) : (
          <>
            {reports.map((report) => (
              <Pressable key={report.id} onPress={() => handleReportPress(report)}>
                <Card variant="elevated" padding="md" style={styles.reportCard}>
                  {/* Status + reason row */}
                  <View style={styles.reportHeader}>
                    <View style={styles.reportMeta}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: STATUS_COLORS[report.status] ?? colors.textTertiary },
                        ]}
                      />
                      <Text style={styles.statusText}>{report.status}</Text>
                      <Text style={styles.reportDot}>·</Text>
                      <Ionicons
                        name={REASON_ICONS[report.reason] ?? "flag-outline"}
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.reasonText}>
                        {t(`community.reportReasons.${report.reason}`, report.reason)}
                      </Text>
                    </View>
                    <Text style={styles.reportTime}>{formatRelativeTime(report.createdAt)}</Text>
                  </View>

                  {/* Target info */}
                  <View style={styles.targetRow}>
                    <Badge
                      variant={report.targetType === "post" ? "primary" : "secondary"}
                      size="sm"
                    >
                      {report.targetType}
                    </Badge>
                    {report.targetAuthor && (
                      <Text style={styles.targetAuthor}>
                        {t("admin.by")} {report.targetAuthor.displayName}
                      </Text>
                    )}
                  </View>

                  {/* Content preview */}
                  {report.targetContent && (
                    <Text style={styles.contentPreview} numberOfLines={3}>
                      {report.targetContent}
                    </Text>
                  )}

                  {/* Reporter */}
                  <View style={styles.reporterRow}>
                    <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.reporterText}>
                      {t("admin.reportedBy")} {report.reporter.displayName}
                    </Text>
                  </View>

                  {/* Action taken (if resolved) */}
                  {report.actionTaken && report.actionTaken !== "none" && (
                    <View style={styles.actionTakenRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                      <Text style={styles.actionTakenText}>{report.actionTaken}</Text>
                    </View>
                  )}
                </Card>
              </Pressable>
            ))}

            {cursor && (
              <Pressable onPress={() => loadReports(false)} style={styles.loadMoreBtn}>
                <Text style={styles.loadMoreText}>{t("admin.loadMore")}</Text>
              </Pressable>
            )}
          </>
        )}

        <View style={{ height: spacing.xxl + insets.bottom }} />
      </ScrollView>

      {/* Action Sheet */}
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        actions={actionSheetItems}
        title={actionSheetTitle}
      />

      {/* Suspend days modal */}
      {suspendModalVisible && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.modalOverlay} onPress={() => setSuspendModalVisible(false)}>
            <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{t("admin.suspendDays")}</Text>
              <Text style={styles.modalSubtitle}>{t("admin.suspendDaysMessage")}</Text>
              <TextInput
                style={styles.modalInput}
                value={suspendDays}
                onChangeText={setSuspendDays}
                keyboardType="number-pad"
                maxLength={3}
                autoFocus
                placeholder="7"
                placeholderTextColor={colors.textTertiary}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setSuspendModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
                </Pressable>
                <Pressable style={styles.modalConfirmBtn} onPress={handleSubmitSuspend}>
                  <Text style={styles.modalConfirmText}>{t("common.confirm")}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: screenPadding.horizontal,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    color: colors.text,
  },

  // Filter
  filterRow: {
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.inputBackground,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },

  // Report card
  reportCard: {
    marginBottom: spacing.sm,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  reportMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  reportDot: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  reasonText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },
  reportTime: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  targetAuthor: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },
  contentPreview: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
    backgroundColor: colors.inputBackground,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  reporterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reporterText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  actionTakenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionTakenText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.primary,
    textTransform: "capitalize",
  },

  // Load more
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.primary,
  },

  // Empty
  centered: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "center",
  },

  // Suspend modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalInput: {
    height: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    backgroundColor: colors.inputBackground,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textInverse,
  },
});
