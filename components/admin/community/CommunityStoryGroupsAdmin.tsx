"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { communityGroupAction } from "@/lib/admin/community-group-actions";
import type { CommunityAdminPermissions, CommunityStoryGroupItem } from "@/types/community-admin";

type CommunityStoryGroupsAdminProps = {
  groups: CommunityStoryGroupItem[];
  permissions: CommunityAdminPermissions;
  onRefresh: () => void;
  disabled?: boolean;
};

const statusLabel: Record<string, string> = {
  active: "Hoạt động",
  posting_restricted: "Hạn chế đăng",
  posting_locked: "Khóa đăng",
  hidden_from_recommendation: "Ẩn khỏi đề xuất"
};

export function CommunityStoryGroupsAdmin({
  groups,
  permissions,
  onRefresh,
  disabled
}: CommunityStoryGroupsAdminProps) {
  if (!groups.length) {
    return (
      <p className="text-sm text-zinc-500">Chưa có nhóm truyện nào để quản lý.</p>
    );
  }

  async function run(
    group: CommunityStoryGroupItem,
    action: Parameters<typeof communityGroupAction>[0]["action"]
  ) {
    const res = await communityGroupAction({
      groupType: "story",
      groupId: group.storyId,
      action,
      label: group.storyTitle
    });
    if (res.ok) onRefresh();
  }

  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <li
          className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"
          key={group.storyId}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white">{group.storyTitle}</h3>
              <p className="mt-1 text-sm text-zinc-400">
                {group.studioName ? `${group.studioName} · ` : ""}
                {group.postsLast24h} bài/24h · {group.reportCount} report
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {statusLabel[group.status] ?? group.status}
                {group.postingLocked ? " · Khóa đăng" : ""}
              </p>
            </div>
            <Link
              className="text-sm text-cyan-300 hover:text-cyan-200"
              href={`/stories/${group.storySlug}`}
            >
              Xem nhóm
            </Link>
          </div>
          {permissions.canModerateGroups ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={disabled}
                onClick={() => run(group, "lock_posting")}
                type="button"
                variant="ghost"
              >
                Khóa đăng
              </Button>
              <Button
                disabled={disabled}
                onClick={() => run(group, "unlock_posting")}
                type="button"
                variant="ghost"
              >
                Mở đăng
              </Button>
              <Button
                disabled={disabled}
                onClick={() => run(group, "restrict_posting")}
                type="button"
                variant="ghost"
              >
                Hạn chế đăng
              </Button>
              <Button
                disabled={disabled}
                onClick={() => run(group, "hide_from_recommendation")}
                type="button"
                variant="ghost"
              >
                Ẩn khỏi đề xuất
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
