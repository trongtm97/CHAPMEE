"use client";

import { Button } from "@/components/ui";
import { communityGroupAction } from "@/lib/admin/community-group-actions";
import type { CommunityAdminPermissions, CommunityAuthorGroupItem } from "@/types/community-admin";

type CommunityAuthorGroupsAdminProps = {
  groups: CommunityAuthorGroupItem[];
  permissions: CommunityAdminPermissions;
  onRefresh: () => void;
  disabled?: boolean;
};

export function CommunityAuthorGroupsAdmin({
  groups,
  permissions,
  onRefresh,
  disabled
}: CommunityAuthorGroupsAdminProps) {
  if (!groups.length) {
    return (
      <p className="text-sm text-zinc-500">Chưa có nhóm tác giả nào để quản lý.</p>
    );
  }

  async function run(
    group: CommunityAuthorGroupItem,
    action: Parameters<typeof communityGroupAction>[0]["action"]
  ) {
    const res = await communityGroupAction({
      groupType: "author",
      groupId: group.creatorId,
      action,
      label: group.studioName
    });
    if (res.ok) onRefresh();
  }

  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <li
          className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"
          key={group.creatorId}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white">
                {group.studioName}
                {group.isVerified ? " ✓" : ""}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {group.followerCount} follower · {group.postCount} bài ·{" "}
                {group.reportCount} report
              </p>
              <p className="mt-1 text-xs text-zinc-500">{group.status}</p>
            </div>
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
