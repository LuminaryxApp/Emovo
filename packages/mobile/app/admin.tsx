import type { ReportWithContext } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback, useMemo } from "react";
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
  Modal,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionSheet, type ActionSheetItem } from "../src/components/ui";
import {
  listReportsApi,
  resolveReportApi,
  getReportStatsApi,
  unbanUserApi,
} from "../src/services/moderation.api";
import { useTheme } from "../src/theme/ThemeContext";
import { cardShadow, cardShadowStrong } from "../src/theme/colors";
import type { ThemeColors } from "../src/theme/colors";
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

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const REASON_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  spam: { icon: "mail-unread-outline", color: "#EAB308", label: "Spam" },
  harassment: { icon: "hand-left-outline", color: "#F97316", label: "Harassment" },
  hate_speech: { icon: "megaphone-outline", color: "#DC2626", label: "Hate Speech" },
  self_harm: { icon: "heart-dislike-outline", color: "#EC4899", label: "Self-Harm" },
  misinformation: { icon: "alert-circle-outline", color: "#8B5CF6", label: "Misinfo" },
  inappropriate: { icon: "eye-off-outline", color: "#6366F1", label: "Inappropriate" },
  other: { icon: "flag-outline", color: "#6B7280", label: "Other" },
};

function getStatusConfig(
  colors: ThemeColors,
): Record<
  string,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }
> {
  return {
    pending: {
      color: "#D97706",
      bg: "rgba(217, 119, 6, 0.10)",
      icon: "hourglass-outline",
      label: "Pending",
    },
    reviewed: {
      color: colors.info,
      bg: "rgba(111, 152, 184, 0.10)",
      icon: "eye-outline",
      label: "Reviewed",
    },
    actioned: {
      color: colors.error,
      bg: "rgba(220, 38, 38, 0.08)",
      icon: "checkmark-done-outline",
      label: "Actioned",
    },
    dismissed: {
      color: colors.textTertiary,
      bg: "rgba(138, 138, 138, 0.08)",
      icon: "close-circle-outline",
      label: "Dismissed",
    },
  };
}

const TARGET_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> =
  {
    post: { icon: "document-text-outline", label: "Post" },
    comment: { icon: "chatbubble-outline", label: "Comment" },
    message: { icon: "mail-outline", label: "Message" },
    user: { icon: "person-outline", label: "User" },
  };

// ---------------------------------------------------------------------------
// Animated Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  value,
  label,
  color,
  index,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80)
        .springify()
        .damping(18)}
      style={s.statCard}
    >
      <View style={[s.statIconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Report Card
// ---------------------------------------------------------------------------

function ReportCard({
  report,
  index,
  onPress,
  statusConfig,
}: {
  report: ReportWithContext;
  index: number;
  onPress: () => void;
  statusConfig: ReturnType<typeof getStatusConfig>;
}) {
  const { colors } = useTheme();
  const reason = REASON_CONFIG[report.reason] ?? REASON_CONFIG.other;
  const status = statusConfig[report.status] ?? statusConfig.pending;
  const targetType = TARGET_TYPE_CONFIG[report.targetType] ?? TARGET_TYPE_CONFIG.post;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const isPending = report.status === "pending";

  return (
    <Animated.View
      entering={FadeInDown.delay(60 + index * 50)
        .springify()
        .damping(20)}
    >
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            s.reportCard,
            { backgroundColor: colors.surface },
            isPending && s.reportCardPending,
            animStyle,
          ]}
        >
          {/* Accent stripe */}
          <View style={[s.reportStripe, { backgroundColor: reason.color }]} />

          <View style={s.reportInner}>
            {/* Top row: reason + status + time */}
            <View style={s.reportTopRow}>
              <View style={s.reportReasonChip}>
                <View style={[s.reasonIconDot, { backgroundColor: `${reason.color}18` }]}>
                  <Ionicons name={reason.icon} size={13} color={reason.color} />
                </View>
                <Text style={[s.reasonLabel, { color: reason.color }]}>{reason.label}</Text>
              </View>

              <View style={s.reportTopRight}>
                <View style={[s.statusChip, { backgroundColor: status.bg }]}>
                  <Ionicons name={status.icon} size={11} color={status.color} />
                  <Text style={[s.statusLabel, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
            </View>

            {/* Content preview */}
            {report.targetContent ? (
              <View style={s.contentPreviewWrap}>
                <View style={[s.contentPreviewQuote, { backgroundColor: colors.border }]} />
                <Text style={[s.contentPreviewText, { color: colors.text }]} numberOfLines={3}>
                  {report.targetContent}
                </Text>
              </View>
            ) : null}

            {/* Target + reporter row */}
            <View style={s.reportBottomRow}>
              <View style={s.reportMetaLeft}>
                {/* Target type badge */}
                <View style={[s.targetBadge, { backgroundColor: colors.inputBackground }]}>
                  <Ionicons name={targetType.icon} size={11} color={colors.textSecondary} />
                  <Text style={[s.targetBadgeText, { color: colors.textSecondary }]}>
                    {targetType.label}
                  </Text>
                </View>

                {report.targetAuthor ? (
                  <>
                    <Text style={[s.metaDot, { color: colors.textTertiary }]}>·</Text>
                    <Text style={[s.metaAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                      {report.targetAuthor.displayName}
                    </Text>
                  </>
                ) : null}
              </View>

              <View style={s.reportMetaRight}>
                <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
                <Text style={[s.metaTime, { color: colors.textTertiary }]}>
                  {formatRelativeTime(report.createdAt)}
                </Text>
              </View>
            </View>

            {/* Reporter line */}
            <View style={s.reporterLine}>
              <Ionicons name="flag-outline" size={10} color={colors.textTertiary} />
              <Text style={[s.reporterText, { color: colors.textTertiary }]}>
                Reported by{" "}
                <Text style={[s.reporterName, { color: colors.textSecondary }]}>
                  {report.reporter.displayName}
                </Text>
              </Text>
            </View>

            {/* Action taken (if resolved) */}
            {report.actionTaken && report.actionTaken !== "none" ? (
              <View style={[s.actionTakenStrip, { borderTopColor: colors.borderLight }]}>
                <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                <Text style={[s.actionTakenLabel, { color: colors.primary }]}>
                  {report.actionTaken.replace(/_/g, " ")}
                </Text>
                {report.adminNote ? (
                  <Text
                    style={[s.actionTakenNote, { color: colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    — {report.adminNote}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Pending action hint */}
            {isPending ? (
              <View style={[s.actionHint, { borderTopColor: colors.borderLight }]}>
                <Text style={[s.actionHintText, { color: colors.primary }]}>
                  Tap to take action
                </Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function AdminScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const statusConfig = useMemo(() => getStatusConfig(colors), [colors]);

  const [reports, setReports] = useState<ReportWithContext[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
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
          setTotalReports(result.reports.length);
        } else {
          setReports((prev) => {
            const combined = [...prev, ...result.reports];
            setTotalReports(combined.length);
            return combined;
          });
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
  }, [statusFilter]); // loadReports/loadStats are stable-enough; statusFilter is the real trigger

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

  const filters = useMemo(
    () => [
      {
        key: "pending" as string | undefined,
        label: t("admin.pending"),
        icon: "hourglass-outline" as keyof typeof Ionicons.glyphMap,
      },
      {
        key: undefined,
        label: t("admin.all"),
        icon: "layers-outline" as keyof typeof Ionicons.glyphMap,
      },
      {
        key: "actioned",
        label: t("admin.actioned"),
        icon: "checkmark-done-outline" as keyof typeof Ionicons.glyphMap,
      },
      {
        key: "dismissed",
        label: t("admin.dismissed"),
        icon: "close-circle-outline" as keyof typeof Ionicons.glyphMap,
      },
    ],
    [t],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={[s.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={["#3D4420", "#5E6B30", "#75863C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTopRow}>
          <Pressable onPress={() => router.back()} style={s.headerBackBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.9)" />
          </Pressable>

          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={s.headerTitle}>{t("admin.title")}</Text>
            <Text style={s.headerSubtitle}>Community safety dashboard</Text>
          </Animated.View>

          <View style={s.headerBadgeWrap}>
            {pendingCount > 0 ? (
              <Animated.View entering={FadeIn.delay(200).duration(300)} style={s.pendingBadge}>
                <Text style={s.pendingBadgeText}>{pendingCount}</Text>
              </Animated.View>
            ) : (
              <View style={s.headerBackBtn} />
            )}
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <StatCard
            icon="hourglass-outline"
            value={pendingCount}
            label="Pending"
            color="#EAB308"
            index={0}
          />
          <StatCard
            icon="documents-outline"
            value={totalReports}
            label="Showing"
            color="rgba(255,255,255,0.85)"
            index={1}
          />
          <StatCard
            icon="shield-checkmark-outline"
            value={reports.filter((r) => r.status === "actioned").length}
            label="Actioned"
            color="#EF4444"
            index={2}
          />
        </View>
      </LinearGradient>

      {/* ── Filter tabs ── */}
      <Animated.View entering={FadeInDown.delay(200).springify().damping(20)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {filters.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <Pressable
                key={f.key ?? "all"}
                style={[
                  s.filterChip,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStatusFilter(f.key);
                }}
              >
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={isActive ? colors.textInverse : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    s.filterChipText,
                    { color: colors.textSecondary },
                    isActive && { color: colors.textInverse },
                  ]}
                >
                  {f.label}
                </Text>
                {f.key === "pending" && pendingCount > 0 ? (
                  <View
                    style={[
                      s.filterBadgeDot,
                      isActive && { backgroundColor: "rgba(255,255,255,0.9)" },
                    ]}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ── Reports list ── */}
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
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
          <Animated.View entering={FadeIn.duration(300)} style={s.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[s.loadingText, { color: colors.textTertiary }]}>Loading reports...</Text>
          </Animated.View>
        ) : reports.length === 0 ? (
          <Animated.View entering={FadeInDown.springify().damping(20)} style={s.emptyState}>
            <View style={[s.emptyIconWrap, { backgroundColor: `${colors.primary}10` }]}>
              <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t("admin.noReports")}</Text>
            <Text style={[s.emptySubtitle, { color: colors.textTertiary }]}>
              {t("admin.noReportsMessage")}
            </Text>
          </Animated.View>
        ) : (
          <>
            {reports.map((report, index) => (
              <ReportCard
                key={report.id}
                report={report}
                index={index}
                onPress={() => handleReportPress(report)}
                statusConfig={statusConfig}
              />
            ))}

            {cursor ? (
              <Pressable
                onPress={() => loadReports(false)}
                style={[s.loadMoreBtn, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="arrow-down-outline" size={16} color={colors.primary} />
                <Text style={[s.loadMoreText, { color: colors.primary }]}>
                  {t("admin.loadMore")}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}

        <View style={{ height: spacing.xxl + insets.bottom }} />
      </ScrollView>

      {/* ── Action Sheet ── */}
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        actions={actionSheetItems}
        title={actionSheetTitle}
      />

      {/* ── Suspend Modal ── */}
      <Modal
        visible={suspendModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuspendModalVisible(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setSuspendModalVisible(false)}>
          <Pressable
            style={[s.modalCard, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header accent */}
            <View style={s.modalAccent}>
              <View style={s.modalAccentIconWrap}>
                <Ionicons name="time-outline" size={22} color="#D97706" />
              </View>
            </View>

            <Text style={[s.modalTitle, { color: colors.text }]}>{t("admin.suspendDays")}</Text>
            <Text style={[s.modalSubtitle, { color: colors.textSecondary }]}>
              {t("admin.suspendDaysMessage")}
            </Text>

            <View style={[s.modalInputWrap, { backgroundColor: colors.inputBackground }]}>
              <TextInput
                style={[s.modalInput, { color: colors.text }]}
                value={suspendDays}
                onChangeText={setSuspendDays}
                keyboardType="number-pad"
                maxLength={3}
                autoFocus
                placeholder="7"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[s.modalInputUnit, { color: colors.textTertiary }]}>days</Text>
            </View>

            {/* Quick presets */}
            <View style={s.presetRow}>
              {[1, 3, 7, 14, 30].map((d) => (
                <Pressable
                  key={d}
                  style={[
                    s.presetChip,
                    { backgroundColor: colors.inputBackground },
                    suspendDays === String(d) && {
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}10`,
                    },
                  ]}
                  onPress={() => setSuspendDays(String(d))}
                >
                  <Text
                    style={[
                      s.presetChipText,
                      { color: colors.textSecondary },
                      suspendDays === String(d) && { color: colors.primary },
                    ]}
                  >
                    {d}d
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={s.modalActions}>
              <Pressable style={s.modalCancelBtn} onPress={() => setSuspendModalVisible(false)}>
                <Text style={[s.modalCancelText, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Pressable style={s.modalConfirmBtn} onPress={handleSubmitSuspend}>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={colors.textInverse}
                  style={{ marginRight: 4 }}
                />
                <Text style={s.modalConfirmText}>{t("common.confirm")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.sm,
  },

  // ── Header ──
  header: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "SourceSerif4_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 2,
  },
  headerBadgeWrap: {
    width: 36,
    alignItems: "center",
  },
  pendingBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_700Bold",
    color: "#FFFFFF",
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "SourceSerif4_700Bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 1,
  },

  // ── Filters ──
  filterRow: {
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    ...cardShadow(),
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  filterBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
    marginLeft: 6,
  },

  // ── Report Card ──
  reportCard: {
    borderRadius: 16,
    marginBottom: spacing.sm + 2,
    overflow: "hidden",
    flexDirection: "row",
    ...cardShadow(),
  },
  reportCardPending: {
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.15)",
  },
  reportStripe: {
    width: 4,
  },
  reportInner: {
    flex: 1,
    padding: spacing.md,
  },

  // Top row
  reportTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  reportReasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reasonIconDot: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonLabel: {
    fontSize: 13,
    fontFamily: "SourceSerif4_700Bold",
    letterSpacing: 0.2,
  },
  reportTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  statusLabel: {
    fontSize: 10,
    fontFamily: "SourceSerif4_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Content preview
  contentPreviewWrap: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  contentPreviewQuote: {
    width: 3,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  contentPreviewText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 19,
    fontStyle: "italic",
  },

  // Bottom meta row
  reportBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  reportMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reportMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  targetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  targetBadgeText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  metaDot: {
    fontSize: 11,
    marginHorizontal: 5,
  },
  metaAuthor: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    flexShrink: 1,
  },
  metaTime: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
  },

  // Reporter line
  reporterLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  reporterText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
  },
  reporterName: {
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // Action taken strip
  actionTakenStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionTakenLabel: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    textTransform: "capitalize",
  },
  actionTakenNote: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    flex: 1,
  },

  // Action hint
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    marginTop: spacing.sm - 2,
    paddingTop: spacing.sm - 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionHintText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // ── Load more ──
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radii.lg,
    ...cardShadow(),
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // ── Loading / Empty ──
  centered: {
    alignItems: "center",
    paddingVertical: spacing.xxl + spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl + spacing.xl,
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "SourceSerif4_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },

  // ── Suspend Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: 24,
    width: "100%",
    maxWidth: 340,
    overflow: "hidden",
    ...cardShadowStrong(),
  },
  modalAccent: {
    height: 56,
    backgroundColor: "rgba(217, 119, 6, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAccentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "SourceSerif4_700Bold",
    textAlign: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.lg,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
  },
  modalInput: {
    height: 52,
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
    textAlign: "center",
    minWidth: 60,
  },
  modalInputUnit: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    marginLeft: 4,
  },
  presetRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  presetChipText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 14,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  modalConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D97706",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 14,
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: "#FFFFFF",
  },
});
