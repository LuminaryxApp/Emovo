import type { UserSearchResult } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Share,
  FlatList,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Avatar, Badge, ActionSheet, type ActionSheetItem } from "../../src/components/ui";
import { getPublicName } from "../../src/lib/display-name";
import { searchUsersApi, createConversationApi } from "../../src/services/community.api";
import { getUnreadCountApi } from "../../src/services/notification.api";
import { useAuthStore } from "../../src/stores/auth.store";
import { useCommunityStore } from "../../src/stores/community.store";
import { moodEmojis } from "../../src/theme";
import { useTheme } from "../../src/theme/ThemeContext";
import { cardShadow, type MoodLevel } from "../../src/theme/colors";
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
  const { colors, gradients } = useTheme();

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

  const deletePost = useCommunityStore((s) => s.deletePost);
  const reportContent = useCommunityStore((s) => s.reportContent);
  const leaveGroup = useCommunityStore((s) => s.leaveGroup);

  const createPost = useCommunityStore((s) => s.createPost);
  const createGroup = useCommunityStore((s) => s.createGroup);

  const conversations = useCommunityStore((s) => s.conversations);
  const isLoadingConversations = useCommunityStore((s) => s.isLoadingConversations);
  const fetchConversations = useCommunityStore((s) => s.fetchConversations);

  const router = useRouter();

  // Local state
  const [activeTab, setActiveTab] = useState<CommunityTab>("feed");
  const [refreshing, setRefreshing] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const groupSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create post modal
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postMoodScore, setPostMoodScore] = useState<number | null>(null);
  const [postType, setPostType] = useState<"mood_update" | "tip" | "photo">("mood_update");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postImageBase64, setPostImageBase64] = useState<string | null>(null);

  // Create group modal
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupIcon, setGroupIcon] = useState("🌿");
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Action sheet
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionSheetItems, setActionSheetItems] = useState<ActionSheetItem[]>([]);

  // New message modal
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMsgSearch, setNewMsgSearch] = useState("");
  const [newMsgResults, setNewMsgResults] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isCreatingConvo, setIsCreatingConvo] = useState(false);
  const newMsgSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Report reason picker
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    targetType: string;
    targetId: string;
  } | null>(null);

  const postInputRef = useRef<TextInput>(null);

  // Notification badge count
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

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
      try {
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
      } catch {
        // Silently fail — data stays as is, pull-to-refresh to retry
      }
    },
    [fetchFeed, fetchMyGroups, fetchDiscoverGroups, fetchConversations],
  );

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  useEffect(() => {
    if (activeTab !== "groups") return;
    if (groupSearchTimerRef.current) clearTimeout(groupSearchTimerRef.current);
    groupSearchTimerRef.current = setTimeout(() => {
      fetchDiscoverGroups(groupSearch || undefined);
    }, 300);
    return () => {
      if (groupSearchTimerRef.current) clearTimeout(groupSearchTimerRef.current);
    };
  }, [groupSearch, activeTab, fetchDiscoverGroups]);

  useEffect(() => {
    let cancelled = false;
    async function fetchUnreadCount() {
      try {
        const count = await getUnreadCountApi();
        if (!cancelled) setUnreadNotifCount(count);
      } catch {
        /* silent */
      }
    }
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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

  const handleOpenCreatePost = useCallback(
    (type: "mood_update" | "tip" | "photo" = "mood_update") => {
      setPostType(type);
      setPostContent("");
      setPostMoodScore(null);
      setPostImageBase64(null);
      setShowCreatePost(true);
    },
    [],
  );

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType ?? "image/jpeg";
      setPostImageBase64(`data:${mime};base64,${result.assets[0].base64}`);
    }
  }, []);

  const handleSubmitPost = useCallback(async () => {
    if (!postContent.trim()) return;
    setIsSubmittingPost(true);
    try {
      await createPost({
        content: postContent.trim(),
        moodScore: postMoodScore ?? undefined,
        type: postType,
        imageBase64: postImageBase64 ?? undefined,
      });
      setShowCreatePost(false);
      setPostContent("");
      setPostMoodScore(null);
      setPostImageBase64(null);
    } catch {
      Alert.alert(t("common.error"), t("community.postError"));
    } finally {
      setIsSubmittingPost(false);
    }
  }, [postContent, postMoodScore, postType, createPost, t]);

  const handleSubmitGroup = useCallback(async () => {
    if (!groupName.trim()) return;
    setIsSubmittingGroup(true);
    try {
      await createGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        icon: groupIcon,
      });
      setShowCreateGroup(false);
      setGroupName("");
      setGroupDescription("");
      setGroupIcon("🌿");
    } catch {
      Alert.alert(t("common.error"), t("community.groupError"));
    } finally {
      setIsSubmittingGroup(false);
    }
  }, [groupName, groupDescription, groupIcon, createGroup, t]);

  const handlePostLongPress = useCallback(
    (postId: string, isOwn: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const items: ActionSheetItem[] = [];

      if (isOwn) {
        items.push({
          label: t("community.delete"),
          icon: "trash-outline",
          destructive: true,
          onPress: () => {
            Alert.alert(t("community.deletePostTitle"), t("community.deletePostMessage"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("community.delete"),
                style: "destructive",
                onPress: async () => {
                  try {
                    await deletePost(postId);
                  } catch {
                    Alert.alert(t("common.error"), t("community.deletePostError"));
                  }
                },
              },
            ]);
          },
        });
      }

      items.push({
        label: t("community.report"),
        icon: "flag-outline",
        onPress: () => {
          setReportTarget({ targetType: "post", targetId: postId });
          setReportSheetVisible(true);
        },
      });

      setActionSheetItems(items);
      setActionSheetVisible(true);
    },
    [deletePost, t],
  );

  const reportReasons = useMemo(
    () =>
      (
        [
          "spam",
          "harassment",
          "hate_speech",
          "self_harm",
          "misinformation",
          "inappropriate",
          "other",
        ] as const
      ).map((reason) => ({
        label: t(`community.reportReasons.${reason}`),
        icon: (reason === "spam"
          ? "mail-outline"
          : reason === "harassment"
            ? "hand-left-outline"
            : reason === "hate_speech"
              ? "megaphone-outline"
              : reason === "self_harm"
                ? "heart-outline"
                : reason === "misinformation"
                  ? "alert-circle-outline"
                  : reason === "inappropriate"
                    ? "eye-off-outline"
                    : "ellipsis-horizontal-outline") as keyof typeof Ionicons.glyphMap,
        onPress: async () => {
          if (!reportTarget) return;
          try {
            await reportContent({
              targetType: reportTarget.targetType,
              targetId: reportTarget.targetId,
              reason,
            });
            Alert.alert(t("community.reportSubmitted"), t("community.reportSubmittedMessage"));
          } catch (err: unknown) {
            const msg =
              err instanceof Error &&
              "response" in err &&
              (err as { response?: { status?: number } }).response?.status === 409
                ? t("community.alreadyReported")
                : t("community.reportFailed");
            Alert.alert(t("common.error"), msg);
          }
          setReportTarget(null);
        },
      })),
    [reportTarget, reportContent, t],
  );

  const handleLeaveGroup = useCallback(
    (groupId: string) => {
      Alert.alert(t("community.leaveGroupTitle"), t("community.leaveGroupMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("community.leaveGroup"),
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGroup(groupId);
            } catch {
              Alert.alert(t("common.error"), t("community.leaveGroupError"));
            }
          },
        },
      ]);
    },
    [leaveGroup, t],
  );

  // Search users for new message modal
  useEffect(() => {
    if (!showNewMessage) return;
    if (!newMsgSearch.trim()) {
      setNewMsgResults([]);
      return;
    }
    if (newMsgSearchTimerRef.current) clearTimeout(newMsgSearchTimerRef.current);
    newMsgSearchTimerRef.current = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const { users } = await searchUsersApi({ q: newMsgSearch.trim(), limit: 20 });
        setNewMsgResults(users);
      } catch {
        // silent
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);
    return () => {
      if (newMsgSearchTimerRef.current) clearTimeout(newMsgSearchTimerRef.current);
    };
  }, [newMsgSearch, showNewMessage]);

  const handleStartConversation = useCallback(
    async (userId: string) => {
      if (isCreatingConvo) return;
      setIsCreatingConvo(true);
      try {
        const convo = await createConversationApi({ participantIds: [userId] });
        setShowNewMessage(false);
        setNewMsgSearch("");
        setNewMsgResults([]);
        router.push(`/conversation/${convo.id}`);
      } catch {
        Alert.alert(
          t("common.error"),
          t("community.conversationError") || "Could not start conversation.",
        );
      } finally {
        setIsCreatingConvo(false);
      }
    },
    [isCreatingConvo, router, t],
  );

  const handleOpenComments = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`);
    },
    [router],
  );

  // ---------------------------------------------------------------------------
  // Render: Header
  // ---------------------------------------------------------------------------

  const renderHeader = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>{t("community.title")}</Text>
      <View style={styles.headerActions}>
        <Pressable
          onPress={() => router.push("/search")}
          style={[styles.headerIconBtn, cardShadow(), { backgroundColor: colors.surface }]}
        >
          <Ionicons name="search-outline" size={iconSizes.sm} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => router.push("/notifications")}
          style={[styles.headerIconBtn, cardShadow(), { backgroundColor: colors.surface }]}
        >
          <View style={styles.tabIconWrap}>
            <Ionicons name="notifications-outline" size={iconSizes.sm} color={colors.text} />
            {unreadNotifCount > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.error }]}>
                <Text style={[styles.tabBadgeText, { color: colors.textInverse }]}>
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // Render: Tab Selector
  // ---------------------------------------------------------------------------

  const renderTabSelector = () => (
    <Animated.View
      entering={FadeInDown.delay(50).duration(400)}
      style={[styles.tabSelector, { backgroundColor: colors.surface }]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const showBadge = tab.key === "messages" && totalUnread > 0;

        return (
          <Pressable
            key={tab.key}
            onPress={() => handleTabChange(tab.key)}
            style={[
              styles.tabButton,
              isActive && [styles.tabButtonActive, { backgroundColor: colors.primaryMuted }],
            ]}
          >
            <View style={styles.tabIconWrap}>
              <Ionicons
                name={tab.icon}
                size={iconSizes.sm}
                color={isActive ? colors.primary : colors.textTertiary}
              />
              {showBadge && (
                <View style={[styles.tabBadge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.tabBadgeText, { color: colors.textInverse }]}>
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textTertiary }]}
            >
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
          <Pressable
            onPress={() => handleOpenCreatePost("mood_update")}
            style={[styles.createPostInput, { backgroundColor: colors.inputBackground }]}
          >
            <Text style={[styles.createPostPlaceholder, { color: colors.textTertiary }]}>
              {t("community.sharePlaceholder")}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.createPostActions, { borderTopColor: colors.borderLight }]}>
          <Pressable
            onPress={() => handleOpenCreatePost("mood_update")}
            style={styles.createPostAction}
          >
            <Ionicons name="happy-outline" size={iconSizes.xs} color={colors.primary} />
            <Text style={[styles.createPostActionText, { color: colors.textSecondary }]}>
              {t("community.mood")}
            </Text>
          </Pressable>
          <Pressable onPress={() => handleOpenCreatePost("tip")} style={styles.createPostAction}>
            <Ionicons name="bulb-outline" size={iconSizes.xs} color={colors.accent} />
            <Text style={[styles.createPostActionText, { color: colors.textSecondary }]}>
              {t("community.tip")}
            </Text>
          </Pressable>
          <Pressable onPress={() => handleOpenCreatePost("photo")} style={styles.createPostAction}>
            <Ionicons name="image-outline" size={iconSizes.xs} color={colors.warning} />
            <Text style={[styles.createPostActionText, { color: colors.textSecondary }]}>
              {t("community.photo")}
            </Text>
          </Pressable>
        </View>
      </Card>
    </Animated.View>
  );

  const renderPostCard = (post: (typeof posts)[0], index: number) => {
    const isOwnPost = user?.id === post.author.id;

    return (
      <Animated.View key={post.id} entering={FadeInDown.delay(150 + index * 60).duration(400)}>
        <Pressable
          onPress={() => handleOpenComments(post.id)}
          onLongPress={() => handlePostLongPress(post.id, isOwnPost)}
        >
          <Card variant="elevated" padding="md" style={styles.postCard}>
            {/* Author row */}
            <View style={styles.postAuthorRow}>
              <Pressable
                onPress={() => router.push(`/profile/${post.author.id}`)}
                style={styles.postAuthorTap}
              >
                <Avatar name={post.author.displayName} size="md" />
                <View style={styles.postAuthorInfo}>
                  <Text style={[styles.postAuthorName, { color: colors.text }]}>
                    {getPublicName(post.author)}
                  </Text>
                  <Text style={[styles.postTimestamp, { color: colors.textTertiary }]}>
                    {formatRelativeTime(post.createdAt)}
                  </Text>
                </View>
              </Pressable>
              {post.moodScore != null && (
                <Badge variant={getMoodBadgeVariant(post.moodScore)} size="sm">
                  {`${moodEmojis[post.moodScore as MoodLevel] ?? ""} ${post.moodScore}/5`}
                </Badge>
              )}
            </View>

            {/* Post type tag */}
            {post.type === "tip" && (
              <View style={[styles.postTypeTag, { backgroundColor: colors.accent + "18" }]}>
                <Ionicons name="bulb" size={13} color={colors.accent} />
                <Text style={[styles.postTypeTagText, { color: colors.accent }]}>
                  {t("community.tip")}
                </Text>
              </View>
            )}
            {post.type === "photo" && (
              <View style={[styles.postTypeTag, { backgroundColor: colors.warning + "18" }]}>
                <Ionicons name="image" size={13} color={colors.warning} />
                <Text style={[styles.postTypeTagText, { color: colors.warning }]}>
                  {t("community.photo")}
                </Text>
              </View>
            )}

            {/* Photo */}
            {post.imageBase64 && (
              <View style={styles.postImageWrap}>
                <Image
                  source={{ uri: post.imageBase64 }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Content */}
            <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

            {/* Actions row */}
            <View style={[styles.postActionsRow, { borderTopColor: colors.borderLight }]}>
              <Pressable onPress={() => handleToggleLike(post.id)} style={styles.postAction}>
                <Ionicons
                  name={post.isLiked ? "heart" : "heart-outline"}
                  size={iconSizes.sm}
                  color={post.isLiked ? colors.error : colors.textTertiary}
                />
                <Text
                  style={[
                    styles.postActionCount,
                    { color: post.isLiked ? colors.error : colors.textSecondary },
                  ]}
                >
                  {post.likeCount > 0 ? post.likeCount : ""}
                </Text>
              </Pressable>

              <Pressable onPress={() => handleOpenComments(post.id)} style={styles.postAction}>
                <Ionicons
                  name="chatbubble-outline"
                  size={iconSizes.sm}
                  color={colors.textSecondary}
                />
                <Text style={[styles.postActionCount, { color: colors.textSecondary }]}>
                  {post.commentCount > 0 ? post.commentCount : ""}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Share.share({
                    message: `${post.author?.displayName}: ${post.content.substring(0, 200)}`,
                  });
                }}
                style={styles.postAction}
              >
                <Ionicons name="share-outline" size={iconSizes.sm} color={colors.textSecondary} />
              </Pressable>
            </View>
          </Card>
        </Pressable>
      </Animated.View>
    );
  };

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
        <>
          {renderCreatePostCard()}
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {t("community.noEntries")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              {t("community.beFirstToPost")}
            </Text>
          </View>
        </>
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
      <Pressable
        key={group.id}
        style={styles.myGroupCard}
        onPress={() => router.push(`/group/${group.id}`)}
      >
        <LinearGradient
          colors={[gStart, gEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.myGroupGradient}
        >
          <Text style={styles.myGroupIcon}>{group.icon || "🌿"}</Text>
        </LinearGradient>
        <Text style={[styles.myGroupName, { color: colors.textSecondary }]} numberOfLines={1}>
          {group.name}
        </Text>
      </Pressable>
    );
  };

  const renderCreateGroupCard = () => (
    <Pressable onPress={() => setShowCreateGroup(true)} style={styles.myGroupCard}>
      <View style={[styles.createGroupCircle, { borderColor: colors.border }]}>
        <Ionicons name="add" size={iconSizes.md} color={colors.primary} />
      </View>
      <Text style={[styles.myGroupName, { color: colors.textSecondary }]} numberOfLines={1}>
        {t("community.createGroup")}
      </Text>
    </Pressable>
  );

  const renderDiscoverGroupItem = (group: (typeof discoverGroups)[0], index: number) => {
    const gStart = group.gradientStart || gradients.primary[0];
    const gEnd = group.gradientEnd || gradients.primary[1];

    return (
      <Animated.View key={group.id} entering={FadeInDown.delay(200 + index * 60).duration(400)}>
        <Pressable onPress={() => router.push(`/group/${group.id}`)}>
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
                <Text style={[styles.discoverGroupName, { color: colors.text }]}>{group.name}</Text>
                {group.description && (
                  <Text
                    style={[styles.discoverGroupDesc, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {group.description}
                  </Text>
                )}
                <Text style={[styles.discoverGroupMembers, { color: colors.textTertiary }]}>
                  {group.memberCount} {t("community.members")}
                </Text>
              </View>
              {!group.isMember ? (
                <Pressable
                  onPress={() => handleJoinGroup(group.id)}
                  style={[styles.joinButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.joinButtonText, { color: colors.textInverse }]}>
                    {t("community.join")}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleLeaveGroup(group.id)}
                  style={[styles.leaveButton, { borderColor: colors.error }]}
                >
                  <Text style={[styles.leaveButtonText, { color: colors.error }]}>
                    {t("community.leave")}
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>
        </Pressable>
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
            <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
              {t("community.myGroups").toUpperCase()}
            </Text>
            <Pressable hitSlop={8}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                {t("community.seeAll")}
              </Text>
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

        {/* Group Search */}
        <View
          style={[
            styles.messageSearchWrap,
            { backgroundColor: colors.inputBackground, marginTop: spacing.lg },
          ]}
        >
          <Ionicons name="search-outline" size={iconSizes.xs} color={colors.textTertiary} />
          <TextInput
            style={[styles.messageSearchInput, { color: colors.text }]}
            placeholder={t("community.searchGroups")}
            placeholderTextColor={colors.textTertiary}
            value={groupSearch}
            onChangeText={setGroupSearch}
          />
        </View>

        {/* Discover Groups */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
            <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
              {t("community.discoverGroups").toUpperCase()}
            </Text>
          </View>
          {discoverGroups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="compass-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {t("community.noEntries")}
              </Text>
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
        <Pressable
          onPress={() => router.push(`/conversation/${convo.id}`)}
          style={[styles.conversationItem, { borderBottomColor: colors.borderLight }]}
        >
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
              {convo.isOnline && (
                <View style={[styles.onlineDot, { borderColor: colors.background }]} />
              )}
            </View>
          )}
          <View style={styles.conversationInfo}>
            <View style={styles.conversationTopRow}>
              <Text
                style={[
                  styles.conversationName,
                  { color: colors.text },
                  convo.unreadCount > 0 && styles.conversationNameUnread,
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {convo.lastMessageAt && (
                <Text style={[styles.conversationTime, { color: colors.textTertiary }]}>
                  {formatRelativeTime(convo.lastMessageAt)}
                </Text>
              )}
            </View>
            <View style={styles.conversationBottomRow}>
              <Text
                style={[
                  styles.conversationLastMsg,
                  { color: colors.textTertiary },
                  convo.unreadCount > 0 && [
                    styles.conversationLastMsgUnread,
                    { color: colors.textSecondary },
                  ],
                ]}
                numberOfLines={1}
              >
                {convo.lastMessage ?? ""}
              </Text>
              {convo.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.unreadBadgeText, { color: colors.textInverse }]}>
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
          <View style={[styles.messageSearchWrap, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="search-outline" size={iconSizes.xs} color={colors.textTertiary} />
            <TextInput
              style={[styles.messageSearchInput, { color: colors.text }]}
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
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/conversation/${c.id}`)}
                  style={styles.onlineItem}
                >
                  <View style={styles.onlineAvatarWrap}>
                    <Avatar name={c.name || "User"} size="lg" />
                    <View style={[styles.onlineDotLarge, { borderColor: colors.background }]} />
                  </View>
                  <Text
                    style={[styles.onlineName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
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
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {t("community.noEntries")}
              </Text>
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
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
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

      {/* New Message FAB (messages tab only) */}
      {activeTab === "messages" && (
        <Pressable
          onPress={() => {
            setShowNewMessage(true);
            setNewMsgSearch("");
            setNewMsgResults([]);
          }}
          style={[
            styles.newMessageFab,
            { bottom: insets.bottom + 8, backgroundColor: colors.primary },
          ]}
        >
          <Ionicons name="create-outline" size={22} color={colors.textInverse} />
        </Pressable>
      )}

      {/* ================================================================ */}
      {/* Create Post Modal */}
      {/* ================================================================ */}
      <Modal visible={showCreatePost} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCreatePost(false)} />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface },
            ]}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowCreatePost(false)}>
                <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("community.createPost")}
              </Text>
              <Pressable
                onPress={handleSubmitPost}
                disabled={!postContent.trim() || isSubmittingPost}
                style={[
                  styles.modalPostButton,
                  { backgroundColor: colors.primary },
                  (!postContent.trim() || isSubmittingPost) && styles.modalPostButtonDisabled,
                ]}
              >
                {isSubmittingPost ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={[styles.modalPostButtonText, { color: colors.textInverse }]}>
                    {t("community.post")}
                  </Text>
                )}
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Post type pills */}
              <View style={styles.postTypePills}>
                {(["mood_update", "tip", "photo"] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setPostType(type)}
                    style={[
                      styles.postTypePill,
                      { backgroundColor: colors.inputBackground },
                      postType === type && [
                        styles.postTypePillActive,
                        { backgroundColor: colors.primary },
                      ],
                    ]}
                  >
                    <Ionicons
                      name={
                        type === "mood_update"
                          ? "happy-outline"
                          : type === "tip"
                            ? "bulb-outline"
                            : "image-outline"
                      }
                      size={14}
                      color={postType === type ? colors.textInverse : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.postTypePillText,
                        { color: colors.textSecondary },
                        postType === type && [
                          styles.postTypePillTextActive,
                          { color: colors.textInverse },
                        ],
                      ]}
                    >
                      {t(`community.${type === "mood_update" ? "mood" : type}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Photo picker (photo type only) */}
              {postType === "photo" && (
                <View style={styles.photoPickerWrap}>
                  {postImageBase64 ? (
                    <View style={styles.photoPreviewWrap}>
                      <Image
                        source={{ uri: postImageBase64 }}
                        style={styles.photoPreview}
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={() => setPostImageBase64(null)}
                        style={styles.photoRemoveBtn}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.error} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handlePickImage}
                      style={[
                        styles.photoPickerBtn,
                        { borderColor: colors.border, backgroundColor: colors.inputBackground },
                      ]}
                    >
                      <Ionicons name="camera-outline" size={28} color={colors.primary} />
                      <Text style={[styles.photoPickerText, { color: colors.primary }]}>
                        {t("community.addPhoto")}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Content input */}
              <TextInput
                ref={postInputRef}
                style={[styles.postTextInput, { color: colors.text }]}
                placeholder={t("community.sharePlaceholder")}
                placeholderTextColor={colors.textTertiary}
                value={postContent}
                onChangeText={setPostContent}
                multiline
                maxLength={2000}
                autoFocus
              />

              {/* Mood score selector */}
              <View style={styles.moodSelector}>
                <Text style={[styles.moodSelectorLabel, { color: colors.sectionLabel }]}>
                  {t("community.howAreYouFeeling")}
                </Text>
                <View style={styles.moodEmojiRow}>
                  {([1, 2, 3, 4, 5] as const).map((score) => (
                    <Pressable
                      key={score}
                      onPress={() => setPostMoodScore(postMoodScore === score ? null : score)}
                      style={[
                        styles.moodEmojiBtn,
                        { backgroundColor: colors.inputBackground },
                        postMoodScore === score && [
                          styles.moodEmojiBtnActive,
                          { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                        ],
                      ]}
                    >
                      <Text style={styles.moodEmoji}>{moodEmojis[score]}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {postContent.length}/2000
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================================ */}
      {/* Create Group Modal */}
      {/* ================================================================ */}
      <Modal visible={showCreateGroup} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCreateGroup(false)} />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface },
            ]}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowCreateGroup(false)}>
                <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("community.createGroup")}
              </Text>
              <Pressable
                onPress={handleSubmitGroup}
                disabled={!groupName.trim() || isSubmittingGroup}
                style={[
                  styles.modalPostButton,
                  { backgroundColor: colors.primary },
                  (!groupName.trim() || isSubmittingGroup) && styles.modalPostButtonDisabled,
                ]}
              >
                {isSubmittingGroup ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={[styles.modalPostButtonText, { color: colors.textInverse }]}>
                    {t("community.create")}
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Icon picker */}
            <View style={styles.groupIconPicker}>
              <Text style={[styles.moodSelectorLabel, { color: colors.sectionLabel }]}>
                {t("community.groupIconLabel")}
              </Text>
              <View style={styles.moodEmojiRow}>
                {["🌿", "💬", "🧘", "💪", "🌈", "❤️", "🎯", "📚"].map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => setGroupIcon(emoji)}
                    style={[
                      styles.moodEmojiBtn,
                      { backgroundColor: colors.inputBackground },
                      groupIcon === emoji && [
                        styles.moodEmojiBtnActive,
                        { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                      ],
                    ]}
                  >
                    <Text style={styles.moodEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Name input */}
            <TextInput
              style={[
                styles.groupInput,
                { color: colors.text, backgroundColor: colors.inputBackground },
              ]}
              placeholder={t("community.groupNamePlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={100}
              autoFocus
            />

            {/* Description input */}
            <TextInput
              style={[
                styles.groupInput,
                styles.groupDescInput,
                { color: colors.text, backgroundColor: colors.inputBackground },
              ]}
              placeholder={t("community.groupDescPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              maxLength={500}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================================ */}
      {/* New Message Modal */}
      {/* ================================================================ */}
      <Modal visible={showNewMessage} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowNewMessage(false)} />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface },
            ]}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowNewMessage(false)}>
                <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("community.newMessage") || "New Message"}
              </Text>
              <View style={{ width: 60 }} />
            </View>

            {/* Search input */}
            <View style={[styles.messageSearchWrap, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="search-outline" size={iconSizes.xs} color={colors.textTertiary} />
              <TextInput
                style={[styles.messageSearchInput, { color: colors.text }]}
                placeholder={t("community.searchUsers") || "Search users..."}
                placeholderTextColor={colors.textTertiary}
                value={newMsgSearch}
                onChangeText={setNewMsgSearch}
                autoFocus
              />
            </View>

            {/* Results */}
            <View style={{ flex: 1, marginTop: spacing.md }}>
              {isSearchingUsers ? (
                <ActivityIndicator
                  style={{ marginTop: spacing.lg }}
                  size="small"
                  color={colors.primary}
                />
              ) : newMsgResults.length === 0 && newMsgSearch.trim() ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="person-outline" size={40} color={colors.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                    {t("community.noUsersFound") || "No users found"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={newMsgResults}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleStartConversation(item.id)}
                      disabled={isCreatingConvo}
                      style={[styles.conversationItem, { borderBottomColor: colors.borderLight }]}
                    >
                      <Avatar name={item.displayName} size="md" />
                      <View style={styles.conversationInfo}>
                        <Text style={[styles.conversationName, { color: colors.text }]}>
                          {getPublicName(item)}
                        </Text>
                        {item.bio ? (
                          <Text
                            style={[styles.conversationLastMsg, { color: colors.textTertiary }]}
                            numberOfLines={1}
                          >
                            {item.bio}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Long-press Action Sheet */}
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        actions={actionSheetItems}
      />

      {/* Report reason picker */}
      <ActionSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        actions={reportReasons}
        title={t("community.selectReportReason")}
      />
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
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Tab Selector ────────────────────────────────────────────
  tabSelector: {
    flexDirection: "row",
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
  tabButtonActive: {},
  tabIconWrap: {
    position: "relative",
  },
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -8,
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
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
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
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  createPostPlaceholder: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
  },
  createPostActions: {
    flexDirection: "row",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
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
  postAuthorTap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  postTimestamp: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 1,
  },
  postTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  postTypeTagText: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  postImageWrap: {
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: radii.md,
  },
  postContent: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  postActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
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
  },
  postActionSpacer: {
    flex: 1,
  },
  postMenuBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
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
    letterSpacing: 1.5,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
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
    textAlign: "center",
  },
  createGroupCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
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
  },
  discoverGroupDesc: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 1,
  },
  discoverGroupMembers: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 2,
  },
  joinButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  joinButtonText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  leaveButton: {
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  leaveButtonText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // ── Messages: Search ────────────────────────────────────────
  messageSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  messageSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
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
  },
  onlineName: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
  },

  // ── Messages: Conversation item ─────────────────────────────
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
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
    flex: 1,
    marginRight: spacing.sm,
  },
  conversationNameUnread: {
    fontFamily: "SourceSerif4_700Bold",
  },
  conversationTime: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
  },
  conversationBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  conversationLastMsg: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    flex: 1,
    marginRight: spacing.sm,
  },
  conversationLastMsgUnread: {
    fontFamily: "SourceSerif4_600SemiBold",
  },
  unreadBadge: {
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
  },

  // ── Modals ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.md,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalCancel: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "SourceSerif4_700Bold",
  },
  modalPostButton: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    minWidth: 60,
    alignItems: "center",
  },
  modalPostButtonDisabled: {
    opacity: 0.5,
  },
  modalPostButtonText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  postTypePills: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  postTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  postTypePillActive: {},
  postTypePillText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  postTypePillTextActive: {},
  postTextInput: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    minHeight: 100,
    textAlignVertical: "top",
    padding: 0,
    marginBottom: spacing.md,
  },
  moodSelector: {
    marginBottom: spacing.md,
  },
  moodSelectorLabel: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  moodEmojiRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  moodEmojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  moodEmojiBtnActive: {
    borderWidth: 2,
  },
  moodEmoji: {
    fontSize: 20,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "right",
    marginBottom: spacing.sm,
  },
  groupIconPicker: {
    marginBottom: spacing.md,
  },
  groupInput: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  groupDescInput: {
    minHeight: 80,
    textAlignVertical: "top",
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
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
  },
  inlineLoader: {
    paddingVertical: spacing.md,
  },
  newMessageFab: {
    position: "absolute",
    right: screenPadding.horizontal,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // ── Photo picker ────────────────────────────────────────────
  photoPickerWrap: {
    marginBottom: spacing.md,
  },
  photoPickerBtn: {
    height: 120,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoPickerText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  photoPreviewWrap: {
    position: "relative",
  },
  photoPreview: {
    width: "100%",
    height: 180,
    borderRadius: radii.lg,
  },
  photoRemoveBtn: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
  },
});
