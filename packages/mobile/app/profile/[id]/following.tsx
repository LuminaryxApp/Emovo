import type { FollowListItem } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
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

import { Avatar } from "../../../src/components/ui";
import { VerifiedBadge } from "../../../src/components/ui/VerifiedBadge";
import { getPublicName } from "../../../src/lib/display-name";
import { getFollowingApi, followUserApi, unfollowUserApi } from "../../../src/services/follow.api";
import { useAuthStore } from "../../../src/stores/auth.store";
import { useTheme } from "../../../src/theme/ThemeContext";
import { spacing, radii, screenPadding } from "../../../src/theme/spacing";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FollowingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [items, setItems] = useState<FollowListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const result = await getFollowingApi(id, { limit: PAGE_SIZE });
      setItems(result.items);
      setCursor(result.cursor);
      setFollowingIds(new Set(result.items.filter((i) => i.isFollowing).map((i) => i.id)));
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const result = await getFollowingApi(id, { limit: PAGE_SIZE });
      setItems(result.items);
      setCursor(result.cursor);
      setFollowingIds(new Set(result.items.filter((i) => i.isFollowing).map((i) => i.id)));
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  const loadMore = useCallback(async () => {
    if (!id || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getFollowingApi(id, { cursor, limit: PAGE_SIZE });
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.cursor);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        result.items.filter((i) => i.isFollowing).forEach((i) => next.add(i.id));
        return next;
      });
    } catch {
      // Silent
    } finally {
      setLoadingMore(false);
    }
  }, [id, cursor, loadingMore]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------------------------------------
  // Follow toggle
  // ---------------------------------------------------------------------------

  const handleToggleFollow = useCallback(
    async (userId: string) => {
      const wasFollowing = followingIds.has(userId);
      // Optimistic update
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });
      try {
        if (wasFollowing) {
          await unfollowUserApi(userId);
        } else {
          await followUserApi(userId);
        }
      } catch {
        // Revert on error
        setFollowingIds((prev) => {
          const next = new Set(prev);
          if (wasFollowing) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });
      }
    },
    [followingIds],
  );

  // ---------------------------------------------------------------------------
  // Render item
  // ---------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item, index }: { item: FollowListItem; index: number }) => {
      const isCurrentUser = item.id === currentUserId;
      const isFollowing = followingIds.has(item.id);

      return (
        <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
          <Pressable
            style={[styles.userItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push(`/profile/${item.id}`)}
          >
            <Avatar name={item.displayName} size="lg" uri={item.avatarBase64 ?? undefined} />
            <View style={styles.userInfo}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {getPublicName(item)}
                </Text>
                <VerifiedBadge tier={item.verificationTier} size="sm" />
              </View>
              {item.username && (
                <Text
                  style={[styles.userHandle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  @{item.username}
                </Text>
              )}
            </View>
            {!isCurrentUser && (
              <Pressable
                style={[
                  styles.toggleButton,
                  isFollowing
                    ? { borderColor: colors.border, borderWidth: 1 }
                    : { backgroundColor: colors.primary },
                ]}
                onPress={() => handleToggleFollow(item.id)}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    { color: isFollowing ? colors.text : "#FFFFFF" },
                  ]}
                >
                  {isFollowing ? t("publicProfile.following") : t("publicProfile.follow")}
                </Text>
              </Pressable>
            )}
          </Pressable>
        </Animated.View>
      );
    },
    [currentUserId, followingIds, colors, router, handleToggleFollow, t],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("publicProfile.followingTab")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            {t("publicProfile.noFollowing")}
          </Text>
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
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
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
    gap: spacing.md,
    paddingHorizontal: screenPadding.horizontal,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // User item
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  userHandle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 1,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    minWidth: 90,
    alignItems: "center",
  },
  toggleButtonText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
});
