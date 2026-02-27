import type { Comment } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Avatar,
  Badge,
  Card,
  ActionSheet,
  type ActionSheetItem,
  PopoverMenu,
  ContextMenu,
} from "../../src/components/ui";
import { getPublicName } from "../../src/lib/display-name";
import { useAuthStore } from "../../src/stores/auth.store";
import { useCommunityStore } from "../../src/stores/community.store";
import { moodEmojis } from "../../src/theme";
import { useTheme } from "../../src/theme/ThemeContext";
import type { MoodLevel } from "../../src/theme/colors";
import { spacing, radii, screenPadding, iconSizes } from "../../src/theme/spacing";

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

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Store
  const user = useAuthStore((s) => s.user);
  const posts = useCommunityStore((s) => s.posts);
  const fetchComments = useCommunityStore((s) => s.fetchComments);
  const createComment = useCommunityStore((s) => s.createComment);
  const deleteComment = useCommunityStore((s) => s.deleteComment);
  const deletePost = useCommunityStore((s) => s.deletePost);
  const reportContent = useCommunityStore((s) => s.reportContent);
  const toggleLike = useCommunityStore((s) => s.toggleLike);

  // Find the post from the store
  const post = posts.find((p) => p.id === id) ?? null;

  // Local state
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    targetType: string;
    targetId: string;
  } | null>(null);

  // Popover menu state (three-dot button)
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const triggerRef = useRef<View>(null);

  const inputRef = useRef<TextInput>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadComments = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const result = await fetchComments(id);
      setComments(result.comments);
      setCursor(result.cursor);
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchComments]);

  const loadMoreComments = useCallback(async () => {
    if (!id || !cursor || isLoading) return;
    try {
      const result = await fetchComments(id, cursor);
      setComments((prev) => [...prev, ...result.comments]);
      setCursor(result.cursor);
    } catch {
      // Silent fail
    }
  }, [id, cursor, isLoading, fetchComments]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !id) return;
    setIsSubmitting(true);
    try {
      const comment = await createComment(id, commentText.trim());
      setComments((prev) => [comment, ...prev]);
      setCommentText("");
    } catch {
      Alert.alert(t("common.error"), t("community.commentError"));
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, id, createComment, t]);

  const handleToggleLike = useCallback(() => {
    if (id) toggleLike(id);
  }, [id, toggleLike]);

  // Memoized post actions (shared by PopoverMenu and ContextMenu)
  const postActions = useMemo<ActionSheetItem[]>(() => {
    if (!id || !post) return [];
    const isOwn = user?.id === post.author.id;
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
                  await deletePost(id);
                  router.back();
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
        setReportTarget({ targetType: "post", targetId: id });
        setReportSheetVisible(true);
      },
    });

    return items;
  }, [id, post, user, deletePost, router, t]);

  // Build comment actions per comment
  const getCommentActions = useCallback(
    (comment: Comment): ActionSheetItem[] => {
      const isOwn = user?.id === comment.author.id;
      const items: ActionSheetItem[] = [];

      if (isOwn) {
        items.push({
          label: t("community.delete"),
          icon: "trash-outline",
          destructive: true,
          onPress: () => {
            Alert.alert(t("community.deleteCommentTitle"), t("community.deleteCommentMessage"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("community.delete"),
                style: "destructive",
                onPress: async () => {
                  if (!id) return;
                  try {
                    await deleteComment(id, comment.id);
                    setComments((prev) => prev.filter((c) => c.id !== comment.id));
                  } catch {
                    Alert.alert(t("common.error"), t("community.deleteCommentError"));
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
          setReportTarget({ targetType: "comment", targetId: comment.id });
          setReportSheetVisible(true);
        },
      });

      return items;
    },
    [id, user, deleteComment, t],
  );

  const handleOpenPopover = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setPopoverAnchor({ x, y, width, height });
      setPopoverVisible(true);
    });
  }, []);

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!post) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            {t("community.noEntries")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}
      keyboardVerticalOffset={0}
    >
      {/* Header bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("community.comments")}</Text>
        <Pressable ref={triggerRef} onPress={handleOpenPopover} style={styles.backButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Post */}
        <ContextMenu actions={postActions}>
          <Card variant="elevated" padding="md" style={styles.postCard}>
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
            {post.type === "tip" && (
              <View style={[styles.postTypeTag, { backgroundColor: colors.accent + "18" }]}>
                <Ionicons name="bulb" size={13} color={colors.accent} />
                <Text style={[styles.postTypeTagText, { color: colors.accent }]}>Tip</Text>
              </View>
            )}
            {(post.imageBase64 || post.imageUrl) && (
              <View style={styles.postImageWrap}>
                <Image
                  source={{ uri: post.imageBase64 ?? post.imageUrl ?? "" }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              </View>
            )}
            <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>
            <View style={[styles.postActionsRow, { borderTopColor: colors.borderLight }]}>
              <Pressable onPress={handleToggleLike} style={styles.postAction}>
                <Ionicons
                  name={post.isLiked ? "heart" : "heart-outline"}
                  size={iconSizes.sm}
                  color={post.isLiked ? colors.error : colors.textTertiary}
                />
                <Text
                  style={[
                    styles.postActionCount,
                    { color: colors.textTertiary },
                    post.isLiked && { color: colors.error },
                  ]}
                >
                  {post.likeCount > 0 ? post.likeCount : ""}
                </Text>
              </Pressable>
              <View style={styles.postAction}>
                <Ionicons name="chatbubble-outline" size={iconSizes.sm} color={colors.primary} />
                <Text style={[styles.postActionCount, { color: colors.primary }]}>
                  {post.commentCount > 0 ? post.commentCount : ""}
                </Text>
              </View>
            </View>
          </Card>
        </ContextMenu>

        {/* Comments section */}
        <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
          {t("community.comments").toUpperCase()} ({post.commentCount})
        </Text>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {t("community.noComments")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              {t("community.beFirstToComment")}
            </Text>
          </View>
        ) : (
          <>
            {comments.map((comment) => (
              <ContextMenu key={comment.id} actions={getCommentActions(comment)}>
                <View style={styles.commentItem}>
                  <Pressable onPress={() => router.push(`/profile/${comment.author.id}`)}>
                    <Avatar name={comment.author.displayName} size="sm" />
                  </Pressable>
                  <View
                    style={[styles.commentContent, { backgroundColor: colors.inputBackground }]}
                  >
                    <View style={styles.commentHeader}>
                      <Pressable onPress={() => router.push(`/profile/${comment.author.id}`)}>
                        <Text style={[styles.commentAuthor, { color: colors.text }]}>
                          {getPublicName(comment.author)}
                        </Text>
                      </Pressable>
                      <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
                        {formatRelativeTime(comment.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.text }]}>
                      {comment.content}
                    </Text>
                  </View>
                </View>
              </ContextMenu>
            ))}
            {cursor && (
              <Pressable onPress={loadMoreComments} style={styles.loadMoreBtn}>
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  {t("community.seeAll")}
                </Text>
              </Pressable>
            )}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Comment input */}
      <View
        style={[
          styles.commentInputBar,
          {
            paddingBottom: insets.bottom + spacing.sm,
            borderTopColor: colors.borderLight,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.commentInput,
            { color: colors.text, backgroundColor: colors.inputBackground },
          ]}
          placeholder={t("community.addComment")}
          placeholderTextColor={colors.textTertiary}
          value={commentText}
          onChangeText={setCommentText}
          maxLength={1000}
          multiline
        />
        <Pressable
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || isSubmitting}
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Ionicons name="send" size={18} color={colors.textInverse} />
          )}
        </Pressable>
      </View>

      {/* Popover menu for three-dot button */}
      <PopoverMenu
        visible={popoverVisible}
        onClose={() => setPopoverVisible(false)}
        actions={postActions}
        anchorPosition={popoverAnchor}
      />

      {/* Report reason picker */}
      <ActionSheet
        visible={reportSheetVisible}
        onClose={() => {
          setReportSheetVisible(false);
          setReportTarget(null);
        }}
        actions={reportReasons}
        title={t("community.selectReportReason")}
      />
    </KeyboardAvoidingView>
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

  // Post
  postCard: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 22,
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

  // Section
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },

  // Comments
  commentItem: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignItems: "flex-start",
  },
  commentContent: {
    flex: 1,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  commentTime: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
  },
  commentText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 20,
  },
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  loadMoreText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // Comment input bar
  commentInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Empty / centered
  centered: {
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
});
