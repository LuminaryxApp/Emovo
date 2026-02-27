"use client";

import type { UserSearchResult } from "@emovo/shared";
import { ChevronDown, Globe, Lock, PenLine, Plus, Search, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CreatePostForm } from "@/components/community/create-post-form";
import { PostCard } from "@/components/community/post-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/cn";
import { getPublicName } from "@/lib/display-name";
import { searchUsersApi } from "@/services/community.api";
import { useAuthStore } from "@/stores/auth.store";
import { useCommunityStore } from "@/stores/community.store";

type Tab = "feed" | "groups";

const EMOJI_OPTIONS = [
  "\u{1F33F}", // 🌿
  "\u{1F4AC}", // 💬
  "\u{1F9D8}", // 🧘
  "\u{1F4AA}", // 💪
  "\u{1F308}", // 🌈
  "\u{2764}\u{FE0F}", // ❤️
  "\u{1F3AF}", // 🎯
  "\u{1F4DA}", // 📚
  "\u{1F30A}", // 🌊
  "\u{1F525}", // 🔥
  "\u{1F4AB}", // 💫
  "\u{1F338}", // 🌸
];

export default function CommunityPage() {
  const {
    posts,
    isLoading,
    hasMore,
    fetchFeed,
    fetchMore,
    myGroups,
    discoverGroups,
    isLoadingGroups,
    fetchMyGroups,
    fetchDiscoverGroups,
    joinGroup,
    leaveGroup,
    createGroup,
  } = useCommunityStore();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Groups state
  const [groupSearch, setGroupSearch] = useState("");
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  // Create group form
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState(EMOJI_OPTIONS[0]);
  const [newGroupIsPublic, setNewGroupIsPublic] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Feed search state
  const [feedSearch, setFeedSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState<UserSearchResult[]>([]);
  const feedSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search debounce
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeTab === "groups") {
      fetchMyGroups();
      fetchDiscoverGroups();
    }
  }, [activeTab, fetchMyGroups, fetchDiscoverGroups]);

  // Debounced search for feed posts and users
  useEffect(() => {
    if (activeTab !== "feed") return;
    if (feedSearchTimerRef.current) clearTimeout(feedSearchTimerRef.current);
    feedSearchTimerRef.current = setTimeout(() => {
      const query = feedSearch.trim().replace(/^@/, "");
      fetchFeed(query || undefined);
      if (query) {
        searchUsersApi({ q: query, limit: 5 })
          .then((r) => setSearchUsers(r.users))
          .catch(() => setSearchUsers([]));
      } else {
        setSearchUsers([]);
      }
    }, 300);
    return () => {
      if (feedSearchTimerRef.current) clearTimeout(feedSearchTimerRef.current);
    };
  }, [feedSearch, activeTab, fetchFeed]);

  // Debounced search for discover groups
  useEffect(() => {
    if (activeTab !== "groups") return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchDiscoverGroups(groupSearch || undefined);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [groupSearch, activeTab, fetchDiscoverGroups]);

  const handleJoinGroup = useCallback(
    async (id: string) => {
      setJoiningId(id);
      try {
        await joinGroup(id);
      } finally {
        setJoiningId(null);
      }
    },
    [joinGroup],
  );

  const handleLeaveGroup = useCallback(
    async (id: string) => {
      setLeavingId(id);
      try {
        await leaveGroup(id);
      } finally {
        setLeavingId(null);
      }
    },
    [leaveGroup],
  );

  const handleCreateGroup = useCallback(async () => {
    if (!newGroupName.trim()) return;
    setIsCreatingGroup(true);
    try {
      await createGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        icon: newGroupIcon,
        isPublic: newGroupIsPublic,
      });
      setShowCreateGroupModal(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupIcon(EMOJI_OPTIONS[0]);
      setNewGroupIsPublic(true);
    } finally {
      setIsCreatingGroup(false);
    }
  }, [createGroup, newGroupName, newGroupDescription, newGroupIcon, newGroupIsPublic]);

  const roleBadgeLabel = useMemo(
    () => (role: string | null) => {
      if (role === "admin") return "Admin";
      if (role === "moderator") return "Mod";
      return null;
    },
    [],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10">
            <Users size={20} className="text-brand-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Community</h1>
            <p className="text-sm text-text-secondary">Share and connect with others</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("feed")}
          className={cn(
            "rounded-[var(--radius-md)] px-5 py-2 text-sm font-semibold transition-colors",
            activeTab === "feed"
              ? "bg-brand-green text-white"
              : "bg-surface-elevated text-text-secondary hover:text-text-primary",
          )}
        >
          Feed
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={cn(
            "rounded-[var(--radius-md)] px-5 py-2 text-sm font-semibold transition-colors",
            activeTab === "groups"
              ? "bg-brand-green text-white"
              : "bg-surface-elevated text-text-secondary hover:text-text-primary",
          )}
        >
          Groups
        </button>
      </div>

      {/* ── Feed Tab ──────────────────────────────────────────── */}
      {activeTab === "feed" && (
        <>
          {/* Create post teaser / form */}
          <div className="animate-slide-up">
            {showCreateForm ? (
              <div className="space-y-3">
                <CreatePostForm onCreated={() => setShowCreateForm(false)} />
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="w-full text-center text-sm text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <Card hover className="cursor-pointer p-4" onClick={() => setShowCreateForm(true)}>
                <div className="flex items-center gap-3">
                  <Avatar src={user?.avatarBase64} name={user?.displayName || "You"} size="sm" />
                  <div className="flex-1 rounded-[var(--radius-md)] border border-border-light bg-input-bg px-4 py-2.5 text-sm text-text-tertiary transition-colors hover:border-brand-green/30">
                    What&apos;s on your mind?
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green transition-colors hover:bg-brand-green/20">
                    <PenLine size={16} />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Feed search */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="text"
              value={feedSearch}
              onChange={(e) => setFeedSearch(e.target.value)}
              placeholder="Search posts and people..."
              className="h-11 w-full rounded-[var(--radius-md)] border border-border-default bg-input-bg pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
          </div>

          {/* User search results */}
          {feedSearch.trim() && searchUsers.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                People
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {searchUsers.map((user) => (
                  <a
                    key={user.id}
                    href={`/profile/${user.id}`}
                    className="flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border border-border-default bg-card-bg p-3 transition-colors hover:bg-card-hover min-w-[100px]"
                  >
                    <Avatar name={getPublicName(user)} size="md" src={user.avatarBase64} />
                    <span className="flex items-center gap-1 text-xs font-medium text-text-primary text-center line-clamp-1">
                      {getPublicName(user)}
                      {user.verificationTier && (
                        <VerifiedBadge tier={user.verificationTier} size={12} />
                      )}
                    </span>
                    {user.username && (
                      <span className="text-[10px] text-text-tertiary">@{user.username}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Post feed */}
          {isLoading && posts.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <div className="mt-4 flex gap-4 border-t border-border-light pt-3">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card className="py-16">
              <EmptyState
                icon={
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/10">
                    <Sparkles size={28} className="text-brand-green" />
                  </div>
                }
                title="Be the first to share"
                description="This community is waiting for your voice. Share how you're feeling, ask a question, or offer encouragement."
                action={
                  <Button onClick={() => setShowCreateForm(true)} size="lg">
                    <PenLine size={16} className="mr-2" />
                    Create First Post
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <div className={cn("space-y-4 animate-stagger")}>
                {posts.map((post) => (
                  <div key={post.id} className="animate-fade-in">
                    <PostCard post={post} />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-2 pb-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchMore(feedSearch.trim() || undefined)}
                    loading={isLoading}
                    size="md"
                    className="gap-1.5"
                  >
                    <ChevronDown size={16} />
                    Load More Posts
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Groups Tab ────────────────────────────────────────── */}
      {activeTab === "groups" && (
        <div className="space-y-8 animate-fade-in">
          {/* My Groups */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">My Groups</h2>

            {isLoadingGroups && myGroups.length === 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-28 w-36 flex-shrink-0 rounded-[var(--radius-lg)]"
                  />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {/* Create Group card */}
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="flex h-28 w-36 flex-shrink-0 flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-border-default bg-surface transition-colors hover:border-brand-green/40 hover:bg-surface-elevated"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                    <Plus size={20} />
                  </div>
                  <span className="text-xs font-semibold text-text-secondary">Create Group</span>
                </button>

                {myGroups.map((group) => (
                  <div
                    key={group.id}
                    className="relative flex h-28 w-36 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] p-3 text-center"
                    style={{
                      background: `linear-gradient(135deg, ${group.gradientStart}, ${group.gradientEnd})`,
                    }}
                  >
                    <span className="text-2xl">{group.icon}</span>
                    <span className="w-full truncate text-xs font-bold text-white drop-shadow-sm">
                      {group.name}
                    </span>
                    <span className="text-[10px] text-white/80">
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                    </span>
                    {roleBadgeLabel(group.role) && (
                      <Badge className="absolute right-1.5 top-1.5 !text-[9px] !px-1.5 !py-0 bg-white/25 text-white backdrop-blur-sm">
                        {roleBadgeLabel(group.role)}
                      </Badge>
                    )}
                  </div>
                ))}

                {myGroups.length === 0 && (
                  <div className="flex flex-1 items-center justify-center py-4">
                    <p className="text-sm text-text-tertiary">
                      You haven&apos;t joined any groups yet. Create one or discover groups below!
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Discover Groups */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">Discover Groups</h2>

            {/* Search */}
            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                type="text"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search groups by name..."
                className="h-11 w-full rounded-[var(--radius-md)] border border-border-default bg-input-bg pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
              />
            </div>

            {isLoadingGroups && discoverGroups.length === 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-[var(--radius-lg)]" />
                ))}
              </div>
            ) : discoverGroups.length === 0 ? (
              <Card className="py-12">
                <EmptyState
                  icon={
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10">
                      <Search size={24} className="text-brand-green" />
                    </div>
                  }
                  title="No groups found"
                  description={
                    groupSearch
                      ? "Try a different search term or create a new group."
                      : "Be the first to create a group for the community!"
                  }
                  action={
                    <Button onClick={() => setShowCreateGroupModal(true)} size="md">
                      <Plus size={16} className="mr-2" />
                      Create Group
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {discoverGroups.map((group) => (
                  <Card key={group.id} className="flex items-start gap-3 p-4">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xl"
                      style={{
                        background: `linear-gradient(135deg, ${group.gradientStart}, ${group.gradientEnd})`,
                      }}
                    >
                      {group.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-text-primary">
                          {group.name}
                        </h3>
                        {!group.isPublic && (
                          <Lock size={12} className="flex-shrink-0 text-text-tertiary" />
                        )}
                      </div>
                      {group.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                          {group.description}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-text-tertiary">
                        {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {group.isMember ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLeaveGroup(group.id)}
                          loading={leavingId === group.id}
                          className="text-xs"
                        >
                          Leave
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleJoinGroup(group.id)}
                          loading={joiningId === group.id}
                          className="text-xs"
                        >
                          Join
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Create Group Modal ────────────────────────────────── */}
      <Modal
        open={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        title="Create Group"
      >
        <div className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Mindful Mornings"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            maxLength={60}
          />

          <Textarea
            label="Description"
            placeholder="What is this group about? (optional)"
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
            rows={3}
            maxLength={300}
          />

          {/* Emoji picker */}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-text-secondary">Icon</span>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewGroupIcon(emoji)}
                  className={cn(
                    "flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] text-xl transition-colors",
                    newGroupIcon === emoji
                      ? "bg-brand-green/15 ring-2 ring-brand-green"
                      : "bg-surface-elevated hover:bg-brand-green/5",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Public / Private toggle */}
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-border-default bg-surface-elevated px-4 py-3">
            <div className="flex items-center gap-2">
              {newGroupIsPublic ? (
                <Globe size={16} className="text-brand-green" />
              ) : (
                <Lock size={16} className="text-text-tertiary" />
              )}
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {newGroupIsPublic ? "Public" : "Private"}
                </p>
                <p className="text-xs text-text-tertiary">
                  {newGroupIsPublic
                    ? "Anyone can find and join this group"
                    : "Only invited members can join"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewGroupIsPublic(!newGroupIsPublic)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                newGroupIsPublic ? "bg-brand-green" : "bg-border-default",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  newGroupIsPublic ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleCreateGroup}
            loading={isCreatingGroup}
            disabled={!newGroupName.trim()}
          >
            Create Group
          </Button>
        </div>
      </Modal>
    </div>
  );
}
