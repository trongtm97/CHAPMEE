import Link from "next/link";
import { Card, EmptyState, Badge, Button } from "@/components/ui";
import { reactToChapter } from "@/lib/supabase/reactions";
import {
  CHAPTER_REACTION_OPTIONS,
  type ChapterReactionKey,
  type ChapterReactionView
} from "@/types/reaction";

type ChapterReactionPanelProps = {
  reaction: ChapterReactionView | null;
  loggedIn: boolean;
  returnTo: string;
  storySlug: string;
  storyTitle: string;
  chapterId: string;
  storyId: string;
  nextChapterHref?: string | null;
};

export function ChapterReactionPanel({ reaction, loggedIn, returnTo, storySlug, chapterId, storyId, nextChapterHref }: ChapterReactionPanelProps) {
  return (
    <Card className="space-y-4 border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.10),rgba(255,255,255,0.03))] p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Sau khi đọc xong</p>
        <h3 className="text-xl font-black text-white">Bạn cảm thấy chap này thế nào?</h3>
        <p className="text-sm leading-6 text-zinc-300">Chọn một cảm xúc để ChapMee hiểu gu đọc của bạn và gợi ý tiếp theo tốt hơn.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHAPTER_REACTION_OPTIONS.map((option) => (
          <form
            key={option.key}
            action={async (formData) => {
              "use server";
              await reactToChapter({
                chapterId: String(formData.get("chapterId") ?? ""),
                storyId: String(formData.get("storyId") ?? ""),
                reactionKey: String(formData.get("reactionKey") ?? "") as ChapterReactionKey,
                returnTo: String(formData.get("returnTo") ?? "")
              });
            }}
          >
            <input name="chapterId" type="hidden" value={chapterId} />
            <input name="storyId" type="hidden" value={storyId} />
            <input name="reactionKey" type="hidden" value={option.key} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <Button
              className={`min-h-11 rounded-full px-3.5 py-2 text-sm font-bold normal-case tracking-normal ${reaction?.userReactionKey === option.key ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-zinc-200"}`}
              disabled={!loggedIn}
              type="submit"
              variant="secondary"
            >
              <span className="mr-2">{option.emoji}</span>
              {option.label}
            </Button>
          </form>
        ))}
      </div>

      {reaction ? (
        <div className="space-y-3 rounded-3xl border border-white/10 bg-black/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-white">{reaction.totalReactions > 0 ? `Tổng ${reaction.totalReactions} reaction` : "Chưa có reaction nào"}</p>
            {reaction.dominantReactionKey ? (
              <Badge variant="success">Phần lớn: {CHAPTER_REACTION_OPTIONS.find((item) => item.key === reaction.dominantReactionKey)?.label ?? "Cuốn"}</Badge>
            ) : null}
          </div>
          <div className="grid gap-2">
            {reaction.options.map((option) => (
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3" key={option.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-zinc-100">{option.emoji} {option.label}</span>
                  <span className="text-zinc-400">{option.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${option.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
          {reaction.hasReacted ? (
            <p className="text-sm text-zinc-300">Bạn đã chọn: <span className="font-bold text-white">{CHAPTER_REACTION_OPTIONS.find((item) => item.key === reaction.userReactionKey)?.label}</span></p>
          ) : null}
        </div>
      ) : (
        <EmptyState title="Chưa có dữ liệu reaction" description="Khi độc giả bắt đầu phản ứng, thống kê sẽ hiện ở đây." />
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Link className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950" href={`/stories/${storySlug}`}>
          Đọc lại truyện
        </Link>
        <Link className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-black uppercase tracking-[0.12em] text-white" href={`/stories/${storySlug}#comments`}>
          Comment nhanh
        </Link>
      </div>

      {nextChapterHref ? (
        <Link className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black uppercase tracking-[0.12em] text-cyan-200" href={nextChapterHref}>
          Đọc chap tiếp
        </Link>
      ) : (
        <p className="text-sm text-zinc-500">Theo dõi truyện để nhận chap mới.</p>
      )}

      <p className="text-xs leading-5 text-zinc-500">
        Bạn có thể share chap, follow truyện hoặc tác giả, và xem comment ngay phía dưới.
      </p>
    </Card>
  );
}
