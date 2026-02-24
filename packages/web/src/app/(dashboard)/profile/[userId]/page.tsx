"use client";

import type { PublicProfile } from "@emovo/shared";
import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicName } from "@/lib/display-name";
import { useToast } from "@/providers/toast-provider";
import { createConversationApi } from "@/services/community.api";
import { getPublicProfileApi, followUserApi, unfollowUserApi } from "@/services/follow.api";
import { useAuthStore } from "@/stores/auth.store";

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { addToast } = useToast();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    getPublicProfileApi(userId)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    if (!profile) return;
    try {
      const result = await followUserApi(userId);
      setProfile((p) =>
        p
          ? {
              ...p,
              followStatus: result.status === "accepted" ? "following" : "pending",
              followerCount: p.followerCount + (result.status === "accepted" ? 1 : 0),
            }
          : p,
      );
    } catch {
      addToast("error", "Failed to follow user");
    }
  };

  const handleMessage = async () => {
    setStartingChat(true);
    try {
      const conversation = await createConversationApi(userId);
      router.push(`/messages/${conversation.id}`);
    } catch {
      addToast("error", "Could not start conversation");
    } finally {
      setStartingChat(false);
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    try {
      await unfollowUserApi(userId);
      setProfile((p) =>
        p ? { ...p, followStatus: "none", followerCount: Math.max(0, p.followerCount - 1) } : p,
      );
    } catch {
      addToast("error", "Failed to unfollow user");
    }
  };

  if (loading) {
    return <Skeleton className="h-60 w-full" />;
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Profile not found</p>
        <Link href="/community" className="mt-2 text-sm text-brand-green hover:underline">
          Back to Community
        </Link>
      </div>
    );
  }

  const isSelf = currentUserId === profile.id;

  return (
    <div className="space-y-6">
      <Link
        href="/community"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand-green"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <Card className="p-6 text-center">
        <Avatar
          src={profile.avatarBase64}
          name={getPublicName(profile)}
          size="3xl"
          className="mx-auto"
        />
        <h2 className="mt-4 text-xl font-bold text-text-primary">{getPublicName(profile)}</h2>
        {profile.username && <p className="text-sm text-text-secondary">@{profile.username}</p>}
        {profile.bio && <p className="mt-2 text-sm text-text-secondary">{profile.bio}</p>}

        <div className="mt-4 flex justify-center gap-6">
          <Link href={`/profile/${userId}/followers`} className="text-center hover:underline">
            <p className="text-lg font-bold text-text-primary">{profile.followerCount}</p>
            <p className="text-xs text-text-secondary">Followers</p>
          </Link>
          <Link href={`/profile/${userId}/following`} className="text-center hover:underline">
            <p className="text-lg font-bold text-text-primary">{profile.followingCount}</p>
            <p className="text-xs text-text-secondary">Following</p>
          </Link>
        </div>

        {!isSelf && (
          <div className="mt-4 flex justify-center gap-3">
            {profile.followStatus === "following" ? (
              <Button variant="outline" onClick={handleUnfollow}>
                Unfollow
              </Button>
            ) : profile.followStatus === "pending" ? (
              <Button variant="secondary" disabled>
                Requested
              </Button>
            ) : (
              <Button onClick={handleFollow}>Follow</Button>
            )}
            <Button variant="secondary" onClick={handleMessage} loading={startingChat}>
              <MessageCircle size={16} className="mr-1.5" />
              Message
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
