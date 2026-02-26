import type { GroupWithMembership } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getGroupConversationApi } from "../../src/services/community.api";
import { useCommunityStore } from "../../src/stores/community.store";
import { useTheme } from "../../src/theme/ThemeContext";
import { spacing, radii, screenPadding, iconSizes } from "../../src/theme/spacing";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useTheme();

  // Store
  const myGroups = useCommunityStore((s) => s.myGroups);
  const discoverGroups = useCommunityStore((s) => s.discoverGroups);
  const joinGroup = useCommunityStore((s) => s.joinGroup);
  const leaveGroup = useCommunityStore((s) => s.leaveGroup);

  const [actionLoading, setActionLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Find group in either list
  const group: GroupWithMembership | undefined = [...myGroups, ...discoverGroups].find(
    (g) => g.id === id,
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleJoin = useCallback(async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      await joinGroup(id);
    } catch {
      Alert.alert(t("common.error"), t("community.groupError"));
    } finally {
      setActionLoading(false);
    }
  }, [id, actionLoading, joinGroup, t]);

  const handleLeave = useCallback(async () => {
    if (!id || actionLoading) return;
    Alert.alert(t("community.leaveGroupTitle"), t("community.leaveGroupMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("community.leaveGroup"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await leaveGroup(id);
          } catch {
            Alert.alert(t("common.error"), t("community.leaveGroupError"));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [id, actionLoading, leaveGroup, t]);

  const handleOpenChat = useCallback(async () => {
    if (!id || chatLoading) return;
    setChatLoading(true);
    try {
      const result = await getGroupConversationApi(id);
      router.push({
        pathname: "/conversation/[id]",
        params: { id: result.id, name: group?.name || "Group Chat" },
      });
    } catch {
      Alert.alert(t("common.error"), t("community.groupChatError") || "Could not open group chat.");
    } finally {
      setChatLoading(false);
    }
  }, [id, chatLoading, router, group?.name, t]);

  // ---------------------------------------------------------------------------
  // Render: Loading state
  // ---------------------------------------------------------------------------

  if (!group) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("community.groups")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const gStart = group.gradientStart || gradients.primary[0];
  const gEnd = group.gradientEnd || gradients.primary[1];

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
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {group.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient Banner */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <LinearGradient
            colors={[gStart, gEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <Text style={styles.bannerIcon}>{group.icon || "\uD83C\uDF3F"}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Group Info */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>

          <View style={styles.groupMetaRow}>
            <Ionicons
              name={group.isPublic ? "globe-outline" : "lock-closed-outline"}
              size={14}
              color={colors.textTertiary}
            />
            <Text style={[styles.groupMetaText, { color: colors.textTertiary }]}>
              {group.isPublic ? t("community.publicGroup") : t("community.privateGroup")}
            </Text>
          </View>

          {group.description && (
            <Text style={[styles.groupDescription, { color: colors.textSecondary }]}>
              {group.description}
            </Text>
          )}
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{group.memberCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("community.members")}
            </Text>
          </View>
        </Animated.View>

        {/* Join / Leave / Chat buttons */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.actionContainer}
        >
          {!group.isMember ? (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleJoin}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.actionButtonText, { color: "#FFFFFF" }]}>
                    {t("community.join")}
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.memberActions}>
              <Pressable
                style={[styles.actionButton, styles.chatButton, { backgroundColor: colors.accent }]}
                onPress={handleOpenChat}
                disabled={chatLoading}
              >
                {chatLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
                    <Text style={[styles.actionButtonText, { color: "#FFFFFF" }]}>
                      {t("community.groupChat") || "Group Chat"}
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.actionButton, { borderColor: colors.error, borderWidth: 1 }]}
                onPress={handleLeave}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Ionicons name="exit-outline" size={18} color={colors.error} />
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>
                      {t("community.leave")}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* Members section */}
        <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
            {t("community.members").toUpperCase()}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="people-outline" size={iconSizes.md} color={colors.textTertiary} />
            <Text style={[styles.sectionCardText, { color: colors.textSecondary }]}>
              {t("community.groupMembers", { count: group.memberCount })}
            </Text>
          </View>
        </Animated.View>

        {/* Chat CTA section (for members) */}
        {group.isMember && (
          <Animated.View entering={FadeInDown.duration(400).delay(600)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
              {t("community.groupChat")?.toUpperCase() || "GROUP CHAT"}
            </Text>
            <Pressable
              onPress={handleOpenChat}
              disabled={chatLoading}
              style={[styles.chatCta, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
              <View style={styles.chatCtaText}>
                <Text style={[styles.chatCtaTitle, { color: colors.text }]}>
                  {t("community.openGroupChat") || "Open Group Chat"}
                </Text>
                <Text style={[styles.chatCtaSubtitle, { color: colors.textSecondary }]}>
                  {t("community.chatWithMembers") || "Chat with group members"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </Pressable>
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

  // Banner
  banner: {
    height: 160,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerIcon: {
    fontSize: 56,
  },

  // Group info
  groupInfo: {
    alignItems: "center",
    paddingHorizontal: screenPadding.horizontal,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  groupName: {
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
    textAlign: "center",
  },
  groupMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  groupMetaText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
  },
  groupDescription: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
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

  // Action button
  actionContainer: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingHorizontal: screenPadding.horizontal,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    minWidth: 160,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // Sections
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: screenPadding.horizontal,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  sectionCardText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
  },

  memberActions: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  chatButton: {
    flex: 1,
  },

  // Chat CTA
  chatCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  chatCtaText: {
    flex: 1,
  },
  chatCtaTitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  chatCtaSubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 2,
  },
});
