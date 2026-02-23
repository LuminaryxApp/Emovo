import type { Notification } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useCallback, useEffect } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listNotificationsApi, markNotificationReadApi } from "../src/services/notification.api";
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

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  like: "heart",
  comment: "chatbubble",
  group_invite: "people",
  reminder: "alarm",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listNotificationsApi({ limit: 30 });
      setItems(result.notifications);
      setCursor(result.cursor);
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await listNotificationsApi({ limit: 30 });
      setItems(result.notifications);
      setCursor(result.cursor);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoading) return;
    try {
      const result = await listNotificationsApi({ cursor, limit: 30 });
      setItems((prev) => [...prev, ...result.notifications]);
      setCursor(result.cursor);
    } catch {
      // Silent
    }
  }, [cursor, isLoading]);

  const handlePress = useCallback(async (item: Notification) => {
    if (!item.readAt) {
      await markNotificationReadApi(item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <Pressable
        style={[
          styles.notifItem,
          { borderBottomColor: colors.borderLight },
          !item.readAt && { backgroundColor: `${colors.primary}06` },
        ]}
        onPress={() => handlePress(item)}
      >
        <View
          style={[
            styles.notifIcon,
            { backgroundColor: colors.inputBackground },
            !item.readAt && { backgroundColor: colors.primary },
          ]}
        >
          <Ionicons
            name={TYPE_ICONS[item.type] ?? "notifications"}
            size={iconSizes.sm}
            color={!item.readAt ? colors.textInverse : colors.textTertiary}
          />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
        <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
          {formatRelativeTime(item.createdAt)}
        </Text>
      </Pressable>
    ),
    [handlePress, colors],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("notifications.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            {t("notifications.empty")}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
            {t("notifications.emptySubtitle")}
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
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
  },
});
