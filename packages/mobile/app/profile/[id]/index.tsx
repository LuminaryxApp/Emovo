import type { PublicProfile } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../../src/components/ui";
import { getPublicName } from "../../../src/lib/display-name";
import { createConversationApi } from "../../../src/services/community.api";
import {
  getPublicProfileApi,
  followUserApi,
  unfollowUserApi,
} from "../../../src/services/follow.api";
import { useTheme } from "../../../src/theme/ThemeContext";
import { spacing, radii, screenPadding, iconSizes } from "../../../src/theme/spacing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useTheme();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPublicProfileApi(id);
      setProfile(data);
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
      const data = await getPublicProfileApi(id);
      setProfile(data);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ---------------------------------------------------------------------------
  // Follow actions
  // ---------------------------------------------------------------------------

  const handleFollow = useCallback(async () => {
    if (!id || !profile || followLoading) return;
    setFollowLoading(true);
    try {
      const result = await followUserApi(id);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followStatus: result.status === "accepted" ? "following" : "pending",
              followerCount:
                result.status === "accepted" ? prev.followerCount + 1 : prev.followerCount,
            }
          : prev,
      );
    } catch {
      Alert.alert(t("common.error"), t("publicProfile.followError"));
    } finally {
      setFollowLoading(false);
    }
  }, [id, profile, followLoading, t]);

  const handleUnfollow = useCallback(async () => {
    if (!id || !profile || followLoading) return;
    Alert.alert(
      t("publicProfile.confirmUnfollow", { name: getPublicName(profile) }),
      t("publicProfile.confirmUnfollowMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("publicProfile.unfollow"),
          style: "destructive",
          onPress: async () => {
            setFollowLoading(true);
            try {
              await unfollowUserApi(id);
              setProfile((prev) =>
                prev
                  ? {
                      ...prev,
                      followStatus: "none",
                      followerCount: Math.max(0, prev.followerCount - 1),
                    }
                  : prev,
              );
            } catch {
              Alert.alert(t("common.error"), t("publicProfile.unfollowError"));
            } finally {
              setFollowLoading(false);
            }
          },
        },
      ],
    );
  }, [id, profile, followLoading, t]);

  const handleCancelRequest = useCallback(async () => {
    if (!id || !profile || followLoading) return;
    Alert.alert(
      t("publicProfile.cancelRequest"),
      t("publicProfile.cancelRequestMessage", { name: getPublicName(profile) }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          onPress: async () => {
            setFollowLoading(true);
            try {
              await unfollowUserApi(id);
              setProfile((prev) => (prev ? { ...prev, followStatus: "none" } : prev));
            } catch {
              Alert.alert(t("common.error"), t("publicProfile.cancelRequestError"));
            } finally {
              setFollowLoading(false);
            }
          },
        },
      ],
    );
  }, [id, profile, followLoading, t]);

  // ---------------------------------------------------------------------------
  // Message action
  // ---------------------------------------------------------------------------

  const handleMessage = useCallback(async () => {
    if (!id || !profile || messageLoading) return;
    setMessageLoading(true);
    try {
      const conversation = await createConversationApi(id);
      router.push({
        pathname: "/conversation/[id]",
        params: { id: conversation.id, name: getPublicName(profile) },
      });
    } catch {
      Alert.alert(t("common.error"), t("publicProfile.messageError"));
    } finally {
      setMessageLoading(false);
    }
  }, [id, profile, messageLoading, router, t]);

  // ---------------------------------------------------------------------------
  // Follow button rendering
  // ---------------------------------------------------------------------------

  const renderFollowButton = () => {
    if (!profile) return null;

    if (profile.followStatus === "self") {
      return (
        <Pressable
          style={[styles.followButton, { borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.text} />
          <Text style={[styles.followButtonText, { color: colors.text }]}>
            {t("publicProfile.editProfile")}
          </Text>
        </Pressable>
      );
    }

    if (profile.followStatus === "none") {
      return (
        <Pressable
          style={[styles.followButton, { backgroundColor: colors.primary }]}
          onPress={handleFollow}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
              <Text style={[styles.followButtonText, { color: "#FFFFFF" }]}>
                {t("publicProfile.follow")}
              </Text>
            </>
          )}
        </Pressable>
      );
    }

    if (profile.followStatus === "following") {
      return (
        <Pressable
          style={[styles.followButton, { borderColor: colors.primary, borderWidth: 1 }]}
          onPress={handleUnfollow}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color={colors.primary} />
              <Text style={[styles.followButtonText, { color: colors.primary }]}>
                {t("publicProfile.following")}
              </Text>
            </>
          )}
        </Pressable>
      );
    }

    if (profile.followStatus === "pending") {
      return (
        <Pressable
          style={[styles.followButton, { backgroundColor: colors.inputBackground }]}
          onPress={handleCancelRequest}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.followButtonText, { color: colors.textSecondary }]}>
                {t("publicProfile.requested")}
              </Text>
            </>
          )}
        </Pressable>
      );
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("publicProfile.title")}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("publicProfile.title")}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            {t("publicProfile.notFound")}
          </Text>
        </View>
      </View>
    );
  }

  const displayName = getPublicName(profile);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Banner gradient */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <LinearGradient
            colors={[...gradients.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          />
        </Animated.View>

        {/* Avatar overlapping banner */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.avatarContainer}
        >
          <View style={[styles.avatarBorder, { backgroundColor: colors.background }]}>
            <Avatar
              name={profile.displayName}
              size="3xl"
              uri={
                profile.avatarBase64 ? `data:image/jpeg;base64,${profile.avatarBase64}` : undefined
              }
            />
          </View>
        </Animated.View>

        {/* Profile info */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.profileInfo}>
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>

          {profile.username && (
            <Text style={[styles.username, { color: colors.textSecondary }]}>
              @{profile.username}
            </Text>
          )}

          {profile.bio && (
            <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>
          )}

          <View style={styles.memberSinceRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.memberSince, { color: colors.textTertiary }]}>
              {t("publicProfile.memberSince", { date: formatMemberSince(profile.createdAt) })}
            </Text>
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.statsRow}>
          <Pressable
            style={styles.statItem}
            onPress={() => router.push(`/profile/${id}/followers`)}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{profile.followerCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("publicProfile.followers")}
            </Text>
          </Pressable>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <Pressable
            style={styles.statItem}
            onPress={() => router.push(`/profile/${id}/following`)}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {profile.followingCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("publicProfile.followingTab")}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500)}
          style={styles.followButtonContainer}
        >
          <View style={styles.actionButtonsRow}>
            {renderFollowButton()}
            {profile.followStatus !== "self" && (
              <Pressable
                style={[styles.messageButton, { borderColor: colors.accent, borderWidth: 1 }]}
                onPress={handleMessage}
                disabled={messageLoading}
              >
                {messageLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.accent} />
                    <Text style={[styles.followButtonText, { color: colors.accent }]}>
                      {t("publicProfile.message")}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Private account notice */}
        {profile.isPrivate &&
          profile.followStatus !== "following" &&
          profile.followStatus !== "self" && (
            <Animated.View
              entering={FadeInDown.duration(400).delay(600)}
              style={[styles.privateNotice, { backgroundColor: colors.inputBackground }]}
            >
              <Ionicons name="lock-closed" size={iconSizes.md} color={colors.textTertiary} />
              <View style={styles.privateNoticeText}>
                <Text style={[styles.privateTitle, { color: colors.text }]}>
                  {t("publicProfile.privateAccount")}
                </Text>
                <Text style={[styles.privateSubtitle, { color: colors.textSecondary }]}>
                  {t("publicProfile.privateAccountDesc")}
                </Text>
              </View>
            </Animated.View>
          )}

        <View style={{ height: spacing.xxl }} />
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
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
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
    flex: 1,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // Banner
  banner: {
    height: 140,
    width: "100%",
  },

  // Avatar
  avatarContainer: {
    alignItems: "center",
    marginTop: -48,
  },
  avatarBorder: {
    padding: 4,
    borderRadius: 52,
  },

  // Profile info
  profileInfo: {
    alignItems: "center",
    paddingHorizontal: screenPadding.horizontal,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  displayName: {
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
    textAlign: "center",
  },
  username: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
  },
  bio: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  memberSinceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  memberSince: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    paddingHorizontal: screenPadding.horizontal,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: "SourceSerif4_700Bold",
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },

  // Follow button
  followButtonContainer: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingHorizontal: screenPadding.horizontal,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    minWidth: 160,
  },
  followButtonText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    minWidth: 120,
  },

  // Private notice
  privateNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    marginHorizontal: screenPadding.horizontal,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  privateNoticeText: {
    flex: 1,
  },
  privateTitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  privateSubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 2,
    lineHeight: 18,
  },
});
