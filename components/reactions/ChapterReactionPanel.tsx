import Link from "next/link";
import { Card, EmptyState, Badge, Button } from "@/components/ui";
import { reactToChapter } from "@/lib/data/reactions";
import { CHAPTER_REACTION_OPTIONS, type ChapterReactionView } from "@/types/reaction";

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

export function ChapterReactionPanel({
  reaction,
  loggedIn,
  returnTo,
  storySlug,
  chapterId,
  storyId,
  nextChapterHref
}: ChapterReactionPanelProps) {
  const types = reaction?.types ?? [];
  const totalReactions = types.reduce((sum, type) => sum + type.visibleCount, 0);
  const selectedTypes = types.filter((type) => type.isSelected);
  const dominantType = [...types].sort((a, b) => b.visibleCount - a.visibleCount)[0];

  return (
    <Card className="space-y-4 border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.10),rgba(255,255,255,0.03))] p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
          Sau khi đọc xong
        </p>
        <h3 className="text-xl font-black text-white">Bạn cảm thấy chap này thế nào?</h3>
        <p className="text-sm leading-6 text-zinc-300">
          Chọn cảm xúc để ChapMee hiểu gu đọc của bạn và gợi ý tiếp theo tốt hơn.
        </p>
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
                reactionKey: String(formData.get("reactionKey") ?? ""),
                returnTo: String(formData.get("returnTo") ?? "")
              });
            }}
          >
            <input name="chapterId" type="hidden" value={chapterId} />
            <input name="storyId" type="hidden" value={storyId} />
            <input name="reactionKey" type="hidden" value={option.key} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <Button
              className={`min-h-11 rounded-full px-3.5 py-2 text-sm font-bold normal-case tracking-normal ${
                types.find((type) => type.key === option.key)?.isSelected
                  ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-zinc-200"
              }`}
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
            <p className="text-sm font-bold text-white">
              {totalReactions > 0 ? `Tổng ${totalReactions} reaction` : "Chưa có reaction nào"}
            </p>
            {dominantType && dominantType.visibleCount > 0 ? (
              <Badge variant="success">Phần lớn: {dominantType.label}</Badge>
            ) : null}
          </div>
          <div className="grid gap-2">
            {types.map((option) => {
              const percent =
                totalReactions > 0
                  ? Math.round((option.visibleCount / totalReactions) * 100)
                  : 0;
              return (
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3" key={option.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-zinc-100">
                      {option.emoji} {option.label}
                    </span>
                    <span className="text-zinc-400">{percent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {selectedTypes.length > 0 ? (
            <p className="text-sm text-zinc-300">
              Bạn đã chọn:{" "}
              <span className="font-bold text-white">
                {selectedTypes.map((type) => type.label).join(", ")}
              </span>
            </p>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Chưa có dữ liệu reaction"
          description="Khi độc giả bắt đầu phản ứng, thống kê sẽ hiện ở đây."
        />
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950"
          href={`/stories/${storySlug}`}
        >
          Đọc lại truyện
        </Link>
        <Link
          className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-black uppercase tracking-[0.12em] text-white"
          href={`/stories/${storySlug}#comments`}
        >
          Comment nhanh
        </Link>
      </div>

      {nextChapterHref ? (
        <Link
          className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black uppercase tracking-[0.12em] text-cyan-200"
          href={nextChapterHref}
        >
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
