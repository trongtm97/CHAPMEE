"use client";

import { useRouter } from "next/navigation";
import { buildCommunityGroupsHref } from "@/lib/community/community-groups-query";
import type {
  CommunityGroupSort,
  CommunityGroupStatusFilter,
  CommunityGroupTab
} from "@/types/community-group";

const sortOptions: { value: CommunityGroupSort; label: string }[] = [
  { value: "hot", label: "Đang hot" },
  { value: "comments", label: "Bình luận mới nhất" },
  { value: "members", label: "Nhiều thành viên" },
  { value: "new_chapter", label: "Có chương mới" },
  { value: "author_reply", label: "Tác giả trả lời" },
  { value: "newest", label: "Mới tạo" }
];

type GroupSortControlProps = {
  sort: CommunityGroupSort;
  query: string;
  genre: string;
  status: CommunityGroupStatusFilter;
  tab: CommunityGroupTab | null;
};

export function GroupSortControl({ genre, query, sort, status, tab }: GroupSortControlProps) {
  const router = useRouter();

  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Sắp xếp
      </span>
      <select
        className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-semibold text-zinc-100 outline-none focus:border-cyan-300/50"
        onChange={(event) => {
          router.push(
            buildCommunityGroupsHref({
              q: query || undefined,
              genre: genre || undefined,
              sort: event.target.value as CommunityGroupSort,
              status: status !== "all" ? status : undefined,
              tab: tab ?? undefined,
              page: 1
            })
          );
        }}
        value={sort}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
