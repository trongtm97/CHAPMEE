import Link from "next/link";
import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import type { CommunityGroupItem } from "@/types/community-group";

const badgeLabel: Record<NonNullable<CommunityGroupItem["badge"]>, string> = {
  hot: "HOT",
  new_chapter: "Có chương mới",
  author_reply: "Tác giả trả lời"
};

type GroupListItemProps = {
  group: CommunityGroupItem;
  cta?: "join" | "follow";
};

export function GroupListItem({ group, cta = "join" }: GroupListItemProps) {
  const meta =
    group.postCount > 0
      ? `${group.newCommentCount} bình luận mới`
      : `${group.memberCount.toLocaleString("vi-VN")} thành viên`;

  return (
    <article className="flex gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <Link className="shrink-0" href={`/community/groups/${group.id}`}>
        <ChapMeeStoryCover
          className="!w-[3.25rem] rounded-lg"
          size="sm"
          story={{ title: group.name, coverUrl: group.coverUrl }}
          usage="communityCard"
        />
      </Link>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link className="min-w-0" href={`/community/groups/${group.id}`}>
            <h3 className="line-clamp-2 text-sm font-bold leading-5 text-zinc-50">{group.name}</h3>
          </Link>
          {group.badge ? (
            <span className="shrink-0 rounded-full bg-cyan-300/15 px-2 py-0.5 text-[0.6rem] font-black uppercase text-cyan-200">
              {badgeLabel[group.badge]}
            </span>
          ) : null}
        </div>

        <p className="line-clamp-1 text-[0.68rem] text-zinc-400">
          {meta}
          {group.genreName ? ` · ${group.genreName}` : null}
        </p>
        <p className="line-clamp-1 text-[0.68rem] text-zinc-500">{group.statusLine}</p>

        <Link
          className="inline-flex h-8 items-center rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20"
          href={`/community/groups/${group.id}`}
        >
          {cta === "follow" ? "Theo dõi" : "Vào nhóm"}
        </Link>
      </div>
    </article>
  );
}
