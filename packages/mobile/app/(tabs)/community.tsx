import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Avatar, Badge } from "../../src/components/ui";
import { useAuthStore } from "../../src/stores/auth.store";
import { useCommunityStore } from "../../src/stores/community.store";
import { moodEmojis } from "../../src/theme";
import { colors, gradients, cardShadow, type MoodLevel } from "../../src/theme/colors";
import { spacing, radii, screenPadding, borderRadius, iconSizes } from "../../src/theme/spacing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommunityTab = "feed" | "groups" | "messages";

interface TabItem {
  key: CommunityTab;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: TabItem[] = [
  { key: "feed", labelKey: "community.feed", icon: "newspaper-outline" },
  { key: "groups", labelKey: "community.groups", icon: "people-outline" },
  { key: "messages", labelKey: "community.messages", icon: "chatbubble-outline" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
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

function getMoodBadgeVariant(moodScore: number): "success" | "primary" | "warning" | "error" {
  if (moodScore >= 4) return "success";
  if (moodScore === 3) return "warning";
  return "error";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommunityScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Stores
  const user = useAuthStore((s) => s.user);

  const posts = useCommunityStore((s) => s.posts);
  const isLoadingFeed = useCommunityStore((s) => s.isLoadingFeed);
  const fetchFeed = useCommunityStore((s) => s.fetchFeed);
  const _fetchMoreFeed = useCommunityStore((s) => s.fetchMoreFeed);
  const toggleLike = useCommunityStore((s) => s.toggleLike);

  const myGroups = useCommunityStore((s) => s.myGroups);
  const discoverGroups = useCommunityStore((s) => s.discoverGroups);
  const isLoadingGroups = useCommunityStore((s) => s.isLoadingGroups);
  const fetchMyGroups = useCommunityStore((s) => s.fetchMyGroups);
  const fetchDiscoverGroups = useCommunityStore((s) => s.fetchDiscoverGroups);
  const joinGroup = useCommunityStore((s) => s.joinGroup);

  const conversations = useCommunityStore((s) => s.conversations);
  const isLoadingConversations = useCommunityStore((s) => s.isLoadingConversations);
  const fetchConversations = useCommunityStore((s) => s.fetchConversations);

  // Local state
  const [activeTab, setActiveTab] = useState<CommunityTab>("feed");
  const [refreshing, setRefreshing] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");

  // Total unread count for the messages badge
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  // Online conversations
  const onlineConversations = useMemo(
    () => conversations.filter((c) => c.isOnline),
    [conversations],
  );

  // Filtered conversations for search
  const filteredConversations = useMemo(() => {
    if (!messageSearch.trim()) return conversations;
    const q = messageSearch.toLowerCase();
    return conversations.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations, messageSearch]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadTabData = useCallback(
    async (tab: CommunityTab) => {
      switch (tab) {
        case "feed":
          await fetchFeed(true);
          break;
        case "groups":
          await Promise.all([fetchMyGroups(), fetchDiscoverGroups()]);
          break;
        case "messages":
          await fetchConversations();
          break;
      }
    },
    [fetchFeed, fetchMyGroups, fetchDiscoverGroups, fetchConversations],
  );

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTabData(activeTab);
    setRefreshing(false);
  }, [activeTab, loadTabData]);

  const handleTabChange = useCallback((tab: CommunityTab) => {
    setActiveTab(tab);
  }, []);

  const handleToggleLike = useCallback(
    (postId: string) => {
      toggleLike(postId);
    },
    [toggleLike],
  );

  const handleJoinGroup = useCallback(
    (groupId: string) => {
      joinGroup(groupId);
    },
    [joinGroup],
  );

  // ---------------------------------------------------------------------------
  // Render: Header
  // ---------------------------------------------------------------------------

  const renderHeader = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
      <Text style={styles.title}>{t("community.title")}</Text>
      <View style={styles.headerActions}>
        <View style={[styles.headerIconBtn, cardShadow()]}>
          <Ionicons name="search-outline" size={iconSizes.sm} color={colors.text} />
        </View>
        <View style={[styles.headerIconBtn, cardShadow()]}>
          <Ionicons name="notifications-outline" size={iconSizes.sm} color={colors.text} />
        </View>
      </View>
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // Render: Tab Selector
  // ---------------------------------------------------------------------------

  const renderTabSelector = () => (
    <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.tabSelector}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const showBadge = tab.key === "messages" && totalUnread > 0;

        return (
          <Pressable
            key={tab.key}
            onPress={() => handleTabChange(tab.key)}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
          >
            <View style={styles.tabIconWrap}>
              <Ionicons
                name={tab.icon}
                size={iconSizes.sm}
                color={isActive ? colors.primary : colors.textTertiary}
              />
              {showBadge && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{totalUnread > 99 ? "99+" : totalUnread}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // Render: Feed Tab
  // ---------------------------------------------------------------------------

  const renderCreatePostCard = () => (
    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
      <Card variant="elevated" padding="md" style={styles.createPostCard}>
        <View style={styles.createPostRow}>
          <Avatar name={user?.displayName ?? "User"} size="md" />
          <Pressable style={styles.createPostInput}>
            <Text style={styles.createPostPlaceholder}>{t("community.sharePlaceholder")}</Text>
          </Pressable>
        </View>
        <View style={styles.createPostActions}>
          <Pressable style={styles.createPostAction}>
            <Ionicons name="happy-outline" size={iconSizes.xs} color={colors.primary} />
            <Text style={styles.createPostActionText}>Mood</Text>
          </Pressable>
          <Pressable style={styles.createPostAction}>
            <Ionicons name="bulb-outline" size={iconSizes.xs} color={colors.accent} />
            <Text style={styles.createPostActionText}>Tip</Text>
          </Pressable>
          <Pressable style={styles.createPostAction}>
            <Ionicons name="image-outline" size={iconSizes.xs} color={colors.warning} />
            <Text style={styles.createPostActionText}>Photo</Text>
          </Pressable>
        </View>
      </Card>
    </Animated.View>
  );

  const renderPostCard = (post: (typeof posts)[0], index: number) => (
    <Animated.View key={post.id} entering={FadeInDown.delay(150 + index * 60).duration(400)}>
      <Card variant="elevated" padding="md" style={styles.postCard}>
        {/* Author row */}
        <View style={styles.postAuthorRow}>
          <Avatar name={post.author.displayName} size="md" />
          <View style={styles.postAuthorInfo}>
            <Text style={styles.postAuthorName}>{post.author.displayName}</Text>
            <Text style={styles.postTimestamp}>{formatRelativeTime(post.createdAt)}</Text>
          </View>
          {post.moodScore != null && (
            <Badge variant={getMoodBadgeVariant(post.moodScore)} size="sm">
              {`${moodEmojis[post.moodScore as MoodLevel] ?? ""} ${post.moodScore}/5`}
            </Badge>
          )}
        </View>

        {/* Content */}
        <Text style={styles.postContent}>{post.content}</Text>

        {/* Actions row */}
        <View style={styles.postActionsRow}>
          <Pressable onPress={() => handleToggleLike(post.id)} style={styles.postAction}>
            <Ionicons
              name={post.isLiked ? "heart" : "heart-outline"}
              size={iconSizes.sm}
              color={post.isLiked ? colors.error : colors.textTertiary}
            />
            <Text style={[styles.postActionCount, post.isLiked && { color: colors.error }]}>
              {post.likeCount > 0 ? post.likeCount : ""}
            </Text>
          </Pressable>

          <Pressable style={styles.postAction}>
            <Ionicons name="chatbubble-outline" size={iconSizes.sm} color={colors.textTertiary} />
            <Text style={styles.postActionCount}>
              {post.commentCount > 0 ? post.commentCount : ""}
            </Text>
          </Pressable>

          <Pressable style={styles.postAction}>
            <Ionicons name="share-outline" size={iconSizes.sm} color={colors.textTertiary} />
          </Pressable>

          <View style={styles.postActionSpacer} />

          <Pressable style={styles.postAction}>
            <Ionicons name="bookmark-outline" size={iconSizes.sm} color={colors.textTertiary} />
          </Pressable>
        </View>
      </Card>
    </Animated.View>
  );

  const renderFeedTab = () => {
    if (isLoadingFeed && posts.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (posts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t("community.noEntries")}</Text>
        </View>
      );
    }

    return (
      <>
        {renderCreatePostCard()}
        {posts.map((post, i) => renderPostCard(post, i))}
        {isLoadingFeed && (
          <ActivityIndicator style={styles.inlineLoader} size="small" color={colors.primary} />
        )}
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Groups Tab
  // ---------------------------------------------------------------------------

  const renderGroupIconCard = (group: (typeof myGroups)[0], _index: number) => {
    const gStart = group.gradientStart || gradients.primary[0];
    const gEnd = group.gradientEnd || gradients.primary[1];

    return (
      <Pressable key={group.id} style={styles.myGroupCard}>
        <LinearGradient
          colors={[gStart, gEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.myGroupGradient}
        >
          <Text style={styles.myGroupIcon}>{group.icon || "🌿"}</Text>
        </LinearGradient>
        <Text style={styles.myGroupName} numberOfLines={1}>
          {group.name}
        </Text>
      </Pressable>
    );
  };

  const renderCreateGroupCard = () => (
    <Pressable style={styles.myGroupCard}>
      <View style={styles.createGroupCircle}>
        <Ionicons name="add" size={iconSizes.md} color={colors.primary} />
      </View>
      <Text style={styles.myGroupName} numberOfLines={1}>
        {t("community.createGroup")}
      </Text>
    </Pressable>
  );

  const renderDiscoverGroupItem = (group: (typeof discoverGroups)[0], index: number) => {
    const gStart = group.gradientStart || gradients.primary[0];
    const gEnd = group.gradientEnd || gradients.primary[1];

    return (
      <Animated.View key={group.id} entering={FadeInDown.delay(200 + index * 60).duration(400)}>
        <Card variant="elevated" padding="md" style={styles.discoverGroupCard}>
          <View style={styles.discoverGroupRow}>
            <LinearGradient
              colors={[gStart, gEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.discoverGroupIcon}
            >
              <Text style={styles.discoverGroupEmoji}>{group.icon || "🌿"}</Text>
            </LinearGradient>
            <View style={styles.discoverGroupInfo}>
              <Text style={styles.discoverGroupName}>{group.name}</Text>
              {group.description && (
                <Text style={styles.discoverGroupDesc} numberOfLines={1}>
                  {group.description}
                </Text>
              )}
              <Text style={styles.discoverGroupMembers}>
                {group.memberCount} {t("community.members")}
              </Text>
            </View>
            {!group.isMember ? (
              <Pressable onPress={() => handleJoinGroup(group.id)} style={styles.joinButton}>
                <Text style={styles.joinButtonText}>{t("community.join")}</Text>
              </Pressable>
            ) : (
              <Badge variant="primary" size="sm">
                Joined
              </Badge>
            )}
          </View>
        </Card>
      </Animated.View>
    );
  };

  const renderGroupsTab = () => {
    if (isLoadingGroups && myGroups.length === 0 && discoverGroups.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <>
        {/* My Groups */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{t("community.myGroups").toUpperCase()}</Text>
            <Pressable hitSlop={8}>
              <Text style={styles.seeAllText}>{t("community.seeAll")}</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.myGroupsScroll}
          >
            {renderCreateGroupCard()}
            {myGroups.map((g, i) => renderGroupIconCard(g, i))}
          </ScrollView>
        </Animated.View>

        {/* Discover Groups */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
            <Text style={styles.sectionLabel}>{t("community.discoverGroups").toUpperCase()}</Text>
          </View>
          {discoverGroups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="compass-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t("community.noEntries")}</Text>
            </View>
          ) : (
            discoverGroups.map((g, i) => renderDiscoverGroupItem(g, i))
          )}
        </Animated.View>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Messages Tab
  // ---------------------------------------------------------------------------

  const renderConversationItem = (convo: (typeof conversations)[0], index: number) => {
    const isGroup = convo.type === "group";
    const displayName = convo.name || "Conversation";

    return (
      <Animated.View key={convo.id} entering={FadeInDown.delay(150 + index * 50).duration(400)}>
        <Pressable style={styles.conversationItem}>
          {isGroup ? (
            <View style={styles.groupAvatarWrap}>
              <LinearGradient
                colors={[...gradients.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.groupAvatarGradient}
              >
                <Ionicons name="people" size={iconSizes.sm} color={colors.textInverse} />
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.conversationAvatarWrap}>
              <Avatar name={displayName} size="lg" />
              {convo.isOnline && <View style={styles.onlineDot} />}
            </View>
          )}
          <View style={styles.conversationInfo}>
            <View style={styles.conversationTopRow}>
              <Text
                style={[
                  styles.conversationName,
                  convo.unreadCount > 0 && styles.conversationNameUnread,
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {convo.lastMessageAt && (
                <Text style={styles.conversationTime}>
                  {formatRelativeTime(convo.lastMessageAt)}
                </Text>
              )}
            </View>
            <View style={styles.conversationBottomRow}>
              <Text
                style={[
                  styles.conversationLastMsg,
                  convo.unreadCount > 0 && styles.conversationLastMsgUnread,
                ]}
                numberOfLines={1}
              >
                {convo.lastMessage ?? ""}
              </Text>
              {convo.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderMessagesTab = () => {
    if (isLoadingConversations && conversations.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <>
        {/* Search */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.messageSearchWrap}>
            <Ionicons name="search-outline" size={iconSizes.xs} color={colors.textTertiary} />
            <TextInput
              style={styles.messageSearchInput}
              placeholder={t("community.searchMessages")}
              placeholderTextColor={colors.textTertiary}
              value={messageSearch}
              onChangeText={setMessageSearch}
            />
          </View>
        </Animated.View>

        {/* Online Now */}
        {onlineConversations.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
              {t("community.onlineNow").toUpperCase()}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.onlineScroll}
            >
              {onlineConversations.map((c) => (
                <Pressable key={c.id} style={styles.onlineItem}>
                  <View style={styles.onlineAvatarWrap}>
                    <Avatar name={c.name || "User"} size="lg" />
                    <View style={styles.onlineDotLarge} />
                  </View>
                  <Text style={styles.onlineName} numberOfLines={1}>
                    {(c.name || "User").split(" ")[0]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Conversations */}
        <View style={{ marginTop: spacing.md }}>
          {filteredConversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t("community.noEntries")}</Text>
            </View>
          ) : (
            filteredConversations.map((c, i) => renderConversationItem(c, i))
          )}
        </View>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {renderHeader()}
        {renderTabSelector()}

        <View style={styles.tabContent}>
          {activeTab === "feed" && renderFeedTab()}
          {activeTab === "groups" && renderGroupsTab()}
          {activeTab === "messages" && renderMessagesTab()}
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: spacing.xxl + 40 }} />
      </ScrollView>
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

  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Tab Selector ────────────────────────────────────────────
  tabSelector: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xs,
    gap: spacing.xs,
    ...cardShadow(),
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    gap: spacing.xs + 2,
  },
  tabButtonActive: {
    backgroundColor: colors.primaryMuted,
  },
  tabIconWrap: {
    position: "relative",
  },
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 9,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.textInverse,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textTertiary,
  },
  tabLabelActive: {
    color: colors.primary,
  },

  // ── Tab Content ─────────────────────────────────────────────
  tabContent: {
    marginTop: spacing.lg,
  },

  // ── Feed: Create post ───────────────────────────────────────
  createPostCard: {
    marginBottom: spacing.md,
  },
  createPostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  createPostInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  createPostPlaceholder: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  createPostActions: {
    flexDirection: "row",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.lg,
    justifyContent: "center",
  },
  createPostAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  createPostActionText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
  },

  // ── Feed: Post card ─────────────────────────────────────────
  postCard: {
    marginBottom: spacing.md,
  },
  postAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
  },
  postTimestamp: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: 1,
  },
  postContent: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  postActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.lg,
  },
  postAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  postActionCount: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  postActionSpacer: {
    flex: 1,
  },

  // ── Section headers ─────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.sectionLabel,
    letterSpacing: 1.5,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.primary,
  },

  // ── Groups: My Groups scroll ────────────────────────────────
  myGroupsScroll: {
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  myGroupCard: {
    alignItems: "center",
    width: 72,
  },
  myGroupGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  myGroupIcon: {
    fontSize: 24,
  },
  myGroupName: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    textAlign: "center",
  },
  createGroupCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },

  // ── Groups: Discover ────────────────────────────────────────
  discoverGroupCard: {
    marginBottom: spacing.sm,
  },
  discoverGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  discoverGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  discoverGroupEmoji: {
    fontSize: 22,
  },
  discoverGroupInfo: {
    flex: 1,
  },
  discoverGroupName: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
  },
  discoverGroupDesc: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginTop: 1,
  },
  discoverGroupMembers: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: 2,
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  joinButtonText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textInverse,
  },

  // ── Messages: Search ────────────────────────────────────────
  messageSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  messageSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    padding: 0,
  },

  // ── Messages: Online now ────────────────────────────────────
  onlineScroll: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  onlineItem: {
    alignItems: "center",
    width: 60,
  },
  onlineAvatarWrap: {
    position: "relative",
    marginBottom: spacing.xs,
  },
  onlineDotLarge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: colors.background,
  },
  onlineName: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    textAlign: "center",
  },

  // ── Messages: Conversation item ─────────────────────────────
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  conversationAvatarWrap: {
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: colors.background,
  },
  groupAvatarWrap: {
    width: 48,
    height: 48,
  },
  groupAvatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  conversationName: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  conversationNameUnread: {
    fontFamily: "SourceSerif4_700Bold",
  },
  conversationTime: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  conversationBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  conversationLastMsg: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    flex: 1,
    marginRight: spacing.sm,
  },
  conversationLastMsgUnread: {
    color: colors.textSecondary,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.textInverse,
  },

  // ── Loading / Empty ─────────────────────────────────────────
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textSecondary,
  },
  inlineLoader: {
    paddingVertical: spacing.md,
  },
});
