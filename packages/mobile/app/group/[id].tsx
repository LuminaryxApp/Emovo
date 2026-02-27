import type { GroupMember, GroupWithMembership } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Badge, PopoverMenu, ContextMenu } from "../../src/components/ui";
import type { ActionSheetItem } from "../../src/components/ui/ActionSheet";
import { GROUP_EMOJIS, GRADIENT_PRESETS } from "../../src/constants/groups";
import { getGroupConversationApi, listGroupMembersApi } from "../../src/services/community.api";
import { useAuthStore } from "../../src/stores/auth.store";
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

  // Auth
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Store
  const myGroups = useCommunityStore((s) => s.myGroups);
  const discoverGroups = useCommunityStore((s) => s.discoverGroups);
  const joinGroup = useCommunityStore((s) => s.joinGroup);
  const leaveGroup = useCommunityStore((s) => s.leaveGroup);
  const updateGroupAction = useCommunityStore((s) => s.updateGroup);
  const deleteGroupAction = useCommunityStore((s) => s.deleteGroup);
  const removeMemberAction = useCommunityStore((s) => s.removeMember);

  // Local state
  const [actionLoading, setActionLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Members state
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersCursor, setMembersCursor] = useState<string | null>(null);

  // Admin popover
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const triggerRef = useRef<View>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editGradientStart, setEditGradientStart] = useState("");
  const [editGradientEnd, setEditGradientEnd] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Find group in either list
  const group: GroupWithMembership | undefined = [...myGroups, ...discoverGroups].find(
    (g) => g.id === id,
  );

  const isAdmin = group?.role === "admin";

  // ---------------------------------------------------------------------------
  // Fetch members
  // ---------------------------------------------------------------------------

  const fetchMembers = useCallback(
    async (reset = true) => {
      if (!id || !group?.isMember) return;
      setMembersLoading(true);
      try {
        const result = await listGroupMembersApi(id, {
          cursor: reset ? undefined : (membersCursor ?? undefined),
          limit: 20,
        });
        setMembers((prev) => (reset ? result.members : [...prev, ...result.members]));
        setMembersCursor(result.cursor);
      } catch {
        // Silently fail
      } finally {
        setMembersLoading(false);
      }
    },
    [id, group?.isMember, membersCursor],
  );

  useEffect(() => {
    if (group?.isMember) {
      fetchMembers(true);
    }
  }, [id, group?.isMember]); // fetchMembers intentionally excluded to avoid re-fetch loops

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
            router.back();
          } catch {
            Alert.alert(t("common.error"), t("community.leaveGroupError"));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [id, actionLoading, leaveGroup, t, router]);

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

  // Admin: open popover
  const handleOpenPopover = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setPopoverAnchor({ x, y, width, height });
      setPopoverVisible(true);
    });
  }, []);

  // Admin: edit group
  const handleOpenEditModal = useCallback(() => {
    if (!group) return;
    setEditName(group.name);
    setEditDescription(group.description || "");
    setEditIcon(group.icon || "\u{1F33F}");
    setEditGradientStart(group.gradientStart || "#75863C");
    setEditGradientEnd(group.gradientEnd || "#8FA04E");
    setShowEditModal(true);
  }, [group]);

  const handleSaveEdit = useCallback(async () => {
    if (!id || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await updateGroupAction(id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        icon: editIcon,
        gradientStart: editGradientStart,
        gradientEnd: editGradientEnd,
      });
      setShowEditModal(false);
    } catch {
      Alert.alert(t("common.error"), t("community.editGroupError"));
    } finally {
      setIsSavingEdit(false);
    }
  }, [
    id,
    isSavingEdit,
    updateGroupAction,
    editName,
    editDescription,
    editIcon,
    editGradientStart,
    editGradientEnd,
    t,
  ]);

  // Admin: delete group
  const handleDeleteGroup = useCallback(() => {
    if (!id) return;
    Alert.alert(t("community.deleteGroupTitle"), t("community.deleteGroupMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("community.deleteGroup"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGroupAction(id);
            router.back();
          } catch {
            Alert.alert(t("common.error"), t("community.deleteGroupError"));
          }
        },
      },
    ]);
  }, [id, deleteGroupAction, t, router]);

  // Admin: remove member
  const handleRemoveMember = useCallback(
    (member: GroupMember) => {
      if (!id) return;
      Alert.alert(t("community.removeMemberTitle"), t("community.removeMemberMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("community.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await removeMemberAction(id, member.userId);
              setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
            } catch {
              Alert.alert(t("common.error"), t("community.removeMemberError"));
            }
          },
        },
      ]);
    },
    [id, removeMemberAction, t],
  );

  // Admin popover actions
  const adminActions: ActionSheetItem[] = useMemo(
    () => [
      {
        label: t("community.editGroup"),
        icon: "create-outline" as const,
        onPress: handleOpenEditModal,
      },
      {
        label: t("community.deleteGroup"),
        icon: "trash-outline" as const,
        destructive: true,
        onPress: handleDeleteGroup,
      },
    ],
    [t, handleOpenEditModal, handleDeleteGroup],
  );

  // Member context menu actions
  const getMemberActions = useCallback(
    (member: GroupMember): ActionSheetItem[] => {
      if (member.role === "admin" || member.userId === currentUserId) return [];
      return [
        {
          label: t("community.removeMember"),
          icon: "person-remove-outline" as const,
          destructive: true,
          onPress: () => handleRemoveMember(member),
        },
      ];
    },
    [currentUserId, t, handleRemoveMember],
  );

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
  // Render: Member row
  // ---------------------------------------------------------------------------

  const renderMemberItem = (member: GroupMember) => {
    const memberActions = isAdmin ? getMemberActions(member) : [];
    const canContext = memberActions.length > 0;
    const isCurrentUser = member.userId === currentUserId;

    const row = (
      <Pressable
        onPress={() => {
          if (!isCurrentUser) {
            router.push({ pathname: "/profile/[id]", params: { id: member.userId } });
          }
        }}
        style={[styles.memberRow, { borderBottomColor: colors.borderLight }]}
      >
        <Avatar
          name={member.displayName}
          size="md"
          uri={member.avatarBase64 ? `data:image/jpeg;base64,${member.avatarBase64}` : undefined}
        />
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
              {member.displayName}
            </Text>
            {member.role === "admin" && (
              <Badge variant="primary" size="sm">
                {t("community.admin")}
              </Badge>
            )}
          </View>
          {member.username && (
            <Text
              style={[styles.memberUsername, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              @{member.username}
            </Text>
          )}
        </View>
        {!isCurrentUser && (
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        )}
      </Pressable>
    );

    if (canContext) {
      return (
        <ContextMenu key={member.userId} actions={memberActions}>
          {row}
        </ContextMenu>
      );
    }

    return <View key={member.userId}>{row}</View>;
  };

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
        {isAdmin ? (
          <Pressable ref={triggerRef} onPress={handleOpenPopover} style={styles.backButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
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
            <Text style={styles.bannerIcon}>{group.icon || "\u{1F33F}"}</Text>
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
            <View style={styles.memberButtonsRow}>
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
        {group.isMember && (
          <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
              {t("community.membersList").toUpperCase()}
            </Text>
            <View style={[styles.membersCard, { backgroundColor: colors.surface }]}>
              {members.map((member) => renderMemberItem(member))}

              {membersLoading && (
                <View style={styles.membersLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}

              {!membersLoading && membersCursor && (
                <Pressable onPress={() => fetchMembers(false)} style={styles.loadMoreButton}>
                  <Text style={[styles.loadMoreText, { color: colors.accent }]}>
                    {t("admin.loadMore") || "Load more"}
                  </Text>
                </Pressable>
              )}

              {!membersLoading && members.length === 0 && (
                <View style={styles.membersEmpty}>
                  <Ionicons name="people-outline" size={iconSizes.md} color={colors.textTertiary} />
                  <Text style={[styles.membersEmptyText, { color: colors.textSecondary }]}>
                    {t("community.groupMembers", { count: 0 })}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

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
              <View style={styles.chatCtaTextContainer}>
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

      {/* Admin PopoverMenu */}
      <PopoverMenu
        visible={popoverVisible}
        onClose={() => setPopoverVisible(false)}
        actions={adminActions}
        anchorPosition={popoverAnchor}
      />

      {/* ================================================================ */}
      {/* Edit Group Modal */}
      {/* ================================================================ */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowEditModal(false)} />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface },
            ]}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("community.editGroup")}
              </Text>
              <Pressable
                onPress={handleSaveEdit}
                disabled={!editName.trim() || isSavingEdit}
                style={[
                  styles.modalSaveButton,
                  { backgroundColor: colors.primary },
                  (!editName.trim() || isSavingEdit) && styles.modalButtonDisabled,
                ]}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={[styles.modalSaveButtonText, { color: colors.textInverse }]}>
                    {t("common.save")}
                  </Text>
                )}
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Live preview */}
              <View style={styles.editPreview}>
                <LinearGradient
                  colors={[editGradientStart || "#75863C", editGradientEnd || "#8FA04E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.editPreviewBanner}
                >
                  <Text style={styles.editPreviewIcon}>{editIcon}</Text>
                </LinearGradient>
              </View>

              {/* Icon picker */}
              <View style={styles.editSection}>
                <Text style={[styles.editSectionLabel, { color: colors.sectionLabel }]}>
                  {t("community.groupIconLabel")}
                </Text>
                <View style={styles.emojiGrid}>
                  {GROUP_EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => setEditIcon(emoji)}
                      style={[
                        styles.emojiBtn,
                        { backgroundColor: colors.inputBackground },
                        editIcon === emoji && [
                          styles.emojiBtnActive,
                          { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                        ],
                      ]}
                    >
                      <Text style={styles.emojiBtnText}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Gradient picker */}
              <View style={styles.editSection}>
                <Text style={[styles.editSectionLabel, { color: colors.sectionLabel }]}>
                  {t("community.gradientLabel")}
                </Text>
                <View style={styles.gradientGrid}>
                  {GRADIENT_PRESETS.map((preset) => {
                    const isSelected =
                      editGradientStart === preset.start && editGradientEnd === preset.end;
                    return (
                      <Pressable
                        key={preset.label}
                        onPress={() => {
                          setEditGradientStart(preset.start);
                          setEditGradientEnd(preset.end);
                        }}
                        style={[
                          styles.gradientSwatch,
                          isSelected && {
                            borderWidth: 2,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={[preset.start, preset.end]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.gradientSwatchInner}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Name input */}
              <TextInput
                style={[
                  styles.editInput,
                  { color: colors.text, backgroundColor: colors.inputBackground },
                ]}
                placeholder={t("community.groupNamePlaceholder")}
                placeholderTextColor={colors.textTertiary}
                value={editName}
                onChangeText={setEditName}
                maxLength={100}
              />

              {/* Description input */}
              <TextInput
                style={[
                  styles.editInput,
                  styles.editDescInput,
                  { color: colors.text, backgroundColor: colors.inputBackground },
                ]}
                placeholder={t("community.groupDescPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                maxLength={500}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  memberButtonsRow: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  chatButton: {
    flex: 1,
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

  // Members
  membersCard: {
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  memberName: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  memberUsername: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
  },
  membersLoading: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  membersEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  membersEmptyText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
  },
  loadMoreButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // Chat CTA
  chatCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  chatCtaTextContainer: {
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

  // ── Edit Modal ────────────────────────────────────────────────
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
  modalSaveButton: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    minWidth: 60,
    alignItems: "center",
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
  },

  // Edit preview
  editPreview: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  editPreviewBanner: {
    width: "100%",
    height: 100,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  editPreviewIcon: {
    fontSize: 40,
  },

  // Edit section
  editSection: {
    marginBottom: spacing.md,
  },
  editSectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },

  // Emoji grid
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  emojiBtnActive: {
    borderWidth: 2,
  },
  emojiBtnText: {
    fontSize: 22,
  },

  // Gradient grid
  gradientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gradientSwatch: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  gradientSwatchInner: {
    flex: 1,
    borderRadius: radii.md - 2,
  },

  // Edit inputs
  editInput: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    marginBottom: spacing.md,
  },
  editDescInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});
