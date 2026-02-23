import type { FollowRequest } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../src/components/ui";
import { getPublicName } from "../src/lib/display-name";
import {
  getFollowRequestsApi,
  acceptFollowRequestApi,
  declineFollowRequestApi,
} from "../src/services/follow.api";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, screenPadding, iconSizes } from "../src/theme/spacing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FollowRequestsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [items, setItems] = useState<FollowRequest[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Track index for staggered animations
  const animIndexRef = useRef(0);

  // ── Data fetching ───────────────────────────────────────────

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getFollowRequestsApi({ limit: 20 });
      setItems(result.items);
      setCursor(result.cursor);
      animIndexRef.current = 0;
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getFollowRequestsApi({ limit: 20 });
      setItems(result.items);
      setCursor(result.cursor);
      animIndexRef.current = 0;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoading) return;
    try {
      const result = await getFollowRequestsApi({ cursor, limit: 20 });
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.cursor);
    } catch {
      // Silent
    }
  }, [cursor, isLoading]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Actions ─────────────────────────────────────────────────

  const handleAccept = useCallback(async (requestId: string) => {
    // Optimistically remove from the list
    setItems((prev) => prev.filter((r) => r.id !== requestId));
    setProcessingIds((prev) => new Set(prev).add(requestId));

    try {
      await acceptFollowRequestApi(requestId);
    } catch {
      // On failure, reload the list to get accurate state
      const result = await getFollowRequestsApi({ limit: 20 });
      setItems(result.items);
      setCursor(result.cursor);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, []);

  const handleDecline = useCallback(async (requestId: string) => {
    // Optimistically remove from the list
    setItems((prev) => prev.filter((r) => r.id !== requestId));
    setProcessingIds((prev) => new Set(prev).add(requestId));

    try {
      await declineFollowRequestApi(requestId);
    } catch {
      // On failure, reload the list to get accurate state
      const result = await getFollowRequestsApi({ limit: 20 });
      setItems(result.items);
      setCursor(result.cursor);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, []);

  const handleUserPress = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}` as never);
    },
    [router],
  );

  // ── Render item ─────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: FollowRequest; index: number }) => {
      const displayName = getPublicName(item.user);
      const isProcessing = processingIds.has(item.id);
      const avatarUri = item.user.avatarBase64
        ? item.user.avatarBase64.startsWith("data:")
          ? item.user.avatarBase64
          : `data:image/jpeg;base64,${item.user.avatarBase64}`
        : undefined;

      return (
        <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
          <View style={[styles.requestItem, { borderBottomColor: colors.borderLight }]}>
            {/* Avatar + Info */}
            <Pressable onPress={() => handleUserPress(item.user.id)} style={styles.userSection}>
              <Avatar name={displayName} size="lg" uri={avatarUri} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.requestTime, { color: colors.textTertiary }]}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
            </Pressable>

            {/* Action buttons */}
            <View style={styles.actions}>
              <Pressable
                onPress={() => handleAccept(item.id)}
                disabled={isProcessing}
                style={[
                  styles.actionBtn,
                  styles.acceptBtn,
                  { backgroundColor: colors.success },
                  isProcessing && styles.actionBtnDisabled,
                ]}
              >
                <Ionicons name="checkmark" size={iconSizes.sm} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => handleDecline(item.id)}
                disabled={isProcessing}
                style={[
                  styles.actionBtn,
                  styles.declineBtn,
                  { backgroundColor: colors.error },
                  isProcessing && styles.actionBtnDisabled,
                ]}
              >
                <Ionicons name="close" size={iconSizes.sm} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      );
    },
    [processingIds, colors, handleAccept, handleDecline, handleUserPress],
  );

  // ── Main render ─────────────────────────────────────────────

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("followRequests.title")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {isLoading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyStateContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="people-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {t("followRequests.empty")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              {t("followRequests.emptySubtitle")}
            </Text>
          </Animated.View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
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
  listContent: {
    paddingTop: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: screenPadding.horizontal,
  },

  // ── Request item ──────────────────────────────────────────
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  userSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
  },

  // ── Actions ───────────────────────────────────────────────
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {},
  declineBtn: {},
  actionBtnDisabled: {
    opacity: 0.5,
  },

  // ── Empty state ───────────────────────────────────────────
  emptyStateContainer: {
    alignItems: "center",
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    maxWidth: 260,
  },
});
