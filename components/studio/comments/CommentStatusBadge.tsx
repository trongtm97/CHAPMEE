import type { StudioCommentInboxItem } from "@/types/comments";

const MS_DAY = 24 * 60 * 60 * 1000;

function isRecent(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < MS_DAY;
}

export function CommentStatusBadge({ item }: { item: StudioCommentInboxItem }) {
  if (item.isHidden) {
    return (
      <span className="rounded-full border border-zinc-500/30 bg-zinc-500/15 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
        Ẩn
      </span>
    );
  }

  if (item.hasOpenReport) {
    return (
      <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-200">
        Báo cáo
      </span>
    );
  }

  if (item.isPinned) {
    return (
      <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold text-violet-200">
        Ghim
      </span>
    );
  }

  if (item.status === "replied" || item.hasAuthorReply) {
    return (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
        Đã trả lời
      </span>
    );
  }

  if (isRecent(item.createdAt)) {
    return (
      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
        Mới
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
      Chưa trả lời
    </span>
  );
}
