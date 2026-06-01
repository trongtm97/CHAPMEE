type ReelsPreviewPanelProps = {
  creatorName: string;
  episodeNumber: number;
  episodeTitle: string;
  excerpt: string;
  storyTitle: string;
};

const mockActions = ["Lưu", "Theo dõi", "Chia sẻ", "Đọc tiếp"];

export function ReelsPreviewPanel({
  creatorName,
  episodeNumber,
  episodeTitle,
  excerpt,
  storyTitle
}: ReelsPreviewPanelProps) {
  return (
    <article className="flex h-full min-h-[32rem] flex-col justify-between rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-sm xl:p-8">
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
          <span>Reels Preview</span>
          <span>ChapMee</span>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            {storyTitle}
          </p>
          <h3 className="text-3xl font-semibold tracking-normal text-white">
            {episodeTitle}
          </h3>
          <p className="text-sm text-zinc-400">
            {creatorName} · Chap {episodeNumber}
          </p>
        </div>

        <p className="max-w-prose text-2xl font-semibold leading-10 text-zinc-100">
          {excerpt}
        </p>
      </div>

      <div className="mt-10 space-y-4">
        <button
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
          type="button"
        >
          Đọc trọn chap
        </button>

        <div className="grid grid-cols-2 gap-3">
          {mockActions.map((action) => (
            <button
              className="min-h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.06]"
              key={action}
              type="button"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
