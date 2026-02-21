import type { Comment } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useCallback, useRef } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Badge, Card } from "../../src/components/ui";
import { useCommunityStore } from "../../src/stores/community.store";
import { moodEmojis } from "../../src/theme";
import { colors, type MoodLevel } from "../../src/theme/colors";
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

  // Store
  const posts = useCommunityStore((s) => s.posts);
  const fetchComments = useCommunityStore((s) => s.fetchComments);
  const createComment = useCommunityStore((s) => s.createComment);
  const toggleLike = useCommunityStore((s) => s.toggleLike);

  // Find the post from the store
  const post = posts.find((p) => p.id === id) ?? null;

  // Local state
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!post) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>{t("community.noEntries")}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { paddingTop: insets.top }]}
      keyboardVerticalOffset={0}
    >
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("community.comments")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Post */}
        <Card variant="elevated" padding="md" style={styles.postCard}>
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
          <Text style={styles.postContent}>{post.content}</Text>
          <View style={styles.postActionsRow}>
            <Pressable onPress={handleToggleLike} style={styles.postAction}>
              <Ionicons
                name={post.isLiked ? "heart" : "heart-outline"}
                size={iconSizes.sm}
                color={post.isLiked ? colors.error : colors.textTertiary}
              />
              <Text style={[styles.postActionCount, post.isLiked && { color: colors.error }]}>
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

        {/* Comments section */}
        <Text style={styles.sectionLabel}>
          {t("community.comments").toUpperCase()} ({post.commentCount})
        </Text>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t("community.noComments")}</Text>
            <Text style={styles.emptySubtitle}>{t("community.beFirstToComment")}</Text>
          </View>
        ) : (
          <>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Avatar name={comment.author.displayName} size="sm" />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.author.displayName}</Text>
                    <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              </View>
            ))}
            {cursor && (
              <Pressable onPress={loadMoreComments} style={styles.loadMoreBtn}>
                <Text style={styles.loadMoreText}>{t("community.seeAll")}</Text>
              </Pressable>
            )}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Comment input */}
      <View style={[styles.commentInputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          ref={inputRef}
          style={styles.commentInput}
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
    </KeyboardAvoidingView>
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
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    lineHeight: 22,
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

  // Section
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.sectionLabel,
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
    backgroundColor: colors.inputBackground,
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
    color: colors.text,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
  },
  commentText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    lineHeight: 20,
  },
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  loadMoreText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.primary,
  },

  // Comment input bar
  commentInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    backgroundColor: colors.inputBackground,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
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
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "center",
  },
});
