import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Avatar } from "../src/components/ui";
import { getPublicName } from "../src/lib/display-name";
import { useCommunityStore } from "../src/stores/community.store";
import { moodEmojis } from "../src/theme";
import { useTheme } from "../src/theme/ThemeContext";
import { cardShadow } from "../src/theme/colors";
import type { MoodLevel } from "../src/theme/colors";
import { spacing, radii, iconSizes } from "../src/theme/spacing";

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useTheme();

  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const searchPosts = useCommunityStore((s) => s.searchPosts);
  const searchUsers = useCommunityStore((s) => s.searchUsers);
  const searchGroups = useCommunityStore((s) => s.searchGroups);
  const isSearching = useCommunityStore((s) => s.isSearching);
  const performSearch = useCommunityStore((s) => s.performSearch);
  const clearSearch = useCommunityStore((s) => s.clearSearch);
  const joinGroup = useCommunityStore((s) => s.joinGroup);

  useEffect(() => {
    return () => {
      clearSearch();
    };
  }, [clearSearch]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, performSearch]);

  const hasResults = searchPosts.length > 0 || searchUsers.length > 0 || searchGroups.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={iconSizes.md} color={colors.text} />
        </Pressable>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search-outline" size={iconSizes.xs} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t("community.searchPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={iconSizes.xs} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Loading */}
      {isSearching && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Results */}
      {!isSearching && hasQuery && hasResults && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* People section */}
          {searchUsers.length > 0 && (
            <Animated.View entering={FadeInDown.delay(50).duration(400)}>
              <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
                {t("community.searchPeople").toUpperCase()}
              </Text>
              <Card variant="elevated" padding="sm" style={styles.sectionCard}>
                {searchUsers.map((user, index) => (
                  <Pressable
                    key={user.id}
                    onPress={() => router.push(`/profile/${user.id}`)}
                    style={[
                      styles.userRow,
                      index < searchUsers.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderLight,
                      },
                    ]}
                  >
                    <Avatar name={getPublicName(user)} size="md" />
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                        {getPublicName(user)}
                      </Text>
                      {user.username && getPublicName(user) !== `@${user.username}` && (
                        <Text
                          style={[styles.userHandle, { color: colors.textTertiary }]}
                          numberOfLines={1}
                        >
                          @{user.username}
                        </Text>
                      )}
                      {user.bio && (
                        <Text
                          style={[styles.userBio, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {user.bio}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={iconSizes.xs}
                      color={colors.textTertiary}
                    />
                  </Pressable>
                ))}
              </Card>
            </Animated.View>
          )}

          {/* Posts section */}
          {searchPosts.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
                {t("community.searchPosts").toUpperCase()}
              </Text>
              {searchPosts.map((post) => (
                <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}`)}>
                  <Card variant="elevated" padding="md" style={styles.postCard}>
                    <View style={styles.postAuthorRow}>
                      <Text style={[styles.postAuthorName, { color: colors.text }]}>
                        {getPublicName(post.author)}
                      </Text>
                      {post.moodScore != null && (
                        <Text style={styles.postMoodEmoji}>
                          {moodEmojis[post.moodScore as MoodLevel] ?? ""}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[styles.postContent, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {post.content}
                    </Text>
                    <View style={styles.postMeta}>
                      <View style={styles.postMetaItem}>
                        <Ionicons
                          name="heart-outline"
                          size={iconSizes.xs}
                          color={colors.textTertiary}
                        />
                        <Text style={[styles.postMetaText, { color: colors.textTertiary }]}>
                          {post.likeCount}
                        </Text>
                      </View>
                      <View style={styles.postMetaItem}>
                        <Ionicons
                          name="chatbubble-outline"
                          size={iconSizes.xs}
                          color={colors.textTertiary}
                        />
                        <Text style={[styles.postMetaText, { color: colors.textTertiary }]}>
                          {post.commentCount}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </Animated.View>
          )}

          {/* Groups section */}
          {searchGroups.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).duration(400)}>
              <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
                {t("community.groups").toUpperCase()}
              </Text>
              {searchGroups.map((group) => {
                const gStart = group.gradientStart || gradients.primary[0];
                const gEnd = group.gradientEnd || gradients.primary[1];

                return (
                  <Card key={group.id} variant="elevated" padding="md" style={styles.groupCard}>
                    <View style={styles.groupRow}>
                      <LinearGradient
                        colors={[gStart, gEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.groupIcon}
                      >
                        <Text style={styles.groupEmoji}>{group.icon || "\uD83C\uDF3F"}</Text>
                      </LinearGradient>
                      <View style={styles.groupInfo}>
                        <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                        <Text style={[styles.groupMembers, { color: colors.textTertiary }]}>
                          {group.memberCount} {t("community.members")}
                        </Text>
                      </View>
                      {!group.isMember ? (
                        <Pressable
                          onPress={() => joinGroup(group.id)}
                          style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                        >
                          <Text style={[styles.joinBtnText, { color: colors.textInverse }]}>
                            {t("community.join")}
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={[styles.joinedBadge, { borderColor: colors.primary }]}>
                          <Text style={[styles.joinedText, { color: colors.primary }]}>
                            {t("community.leave")}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })}
            </Animated.View>
          )}

          {/* Bottom spacer */}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* Empty state */}
      {!isSearching && hasQuery && !hasResults && (
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t("community.searchNoResults")}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    padding: 0,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "SourceSerif4_600SemiBold",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // People
  sectionCard: {
    ...cardShadow(),
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  userHandle: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 1,
  },
  userBio: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 2,
  },

  // Posts
  postCard: {
    marginBottom: spacing.sm,
    ...cardShadow(),
  },
  postAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  postAuthorName: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  postMoodEmoji: {
    fontSize: 18,
  },
  postContent: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  postMeta: {
    flexDirection: "row",
    gap: spacing.md,
  },
  postMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  postMetaText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
  },

  // Groups
  groupCard: {
    marginBottom: spacing.sm,
    ...cardShadow(),
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  groupEmoji: {
    fontSize: 22,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  groupMembers: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 2,
  },
  joinBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  joinBtnText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  joinedBadge: {
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  joinedText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },
});
