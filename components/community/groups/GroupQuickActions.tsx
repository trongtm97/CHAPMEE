import Link from "next/link";
import { buildCommunityGroupsHref } from "@/lib/community/community-groups-query";

type GroupQuickActionsProps = {
  onSuggestClick?: () => void;
};

export function GroupQuickActions({ onSuggestClick }: GroupQuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {onSuggestClick ? (
        <button
          className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/15"
          onClick={onSuggestClick}
          type="button"
        >
          + Đề xuất nhóm
        </button>
      ) : (
        <Link
          className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/15"
          href="/community/groups/new"
        >
          + Đề xuất nhóm
        </Link>
      )}
      <Link
        className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-zinc-200 transition hover:border-white/20"
        href={buildCommunityGroupsHref({ status: "following", tab: "following" })}
      >
        Nhóm của tôi
      </Link>
    </div>
  );
}
