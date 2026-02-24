"use client";

import type { FollowListItem } from "@emovo/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicName } from "@/lib/display-name";
import { getFollowersApi } from "@/services/follow.api";

export default function FollowersPage() {
  const { userId } = useParams<{ userId: string }>();
  const [followers, setFollowers] = useState<FollowListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFollowersApi(userId, { limit: 50 })
      .then((r) => setFollowers(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="space-y-6">
      <Link
        href={`/profile/${userId}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand-green"
      >
        <ArrowLeft size={16} />
        Back to Profile
      </Link>
      <h1 className="text-2xl font-bold text-text-primary">Followers</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : followers.length === 0 ? (
        <EmptyState title="No followers yet" />
      ) : (
        <div className="space-y-2">
          {followers.map((f) => (
            <Link key={f.id} href={`/profile/${f.id}`}>
              <Card className="flex items-center gap-3 p-3 hover:bg-surface-elevated">
                <Avatar src={f.avatarBase64} name={getPublicName(f)} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{getPublicName(f)}</p>
                  {f.username && <p className="text-xs text-text-secondary">@{f.username}</p>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
