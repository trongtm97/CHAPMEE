type SwipePreviewProps = {
  creatorName: string;
  episodeNumber: number;
  episodeTitle: string;
  excerpt: string;
  storyTitle: string;
};

const mockActions = ["Lưu", "Theo dõi"];

export function SwipePreview({
  creatorName,
  episodeNumber,
  episodeTitle,
  excerpt,
  storyTitle
}: SwipePreviewProps) {
  return (
    <article className="flex min-h-[calc(100svh-12rem)] flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div>
        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
          <span>Preview</span>
          <span>ChapMee</span>
        </div>
        <div className="mt-8 space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            {storyTitle}
          </p>
          <h2 className="text-2xl font-bold tracking-normal text-white">
            {episodeTitle}
          </h2>
          <p className="text-sm text-zinc-500">
            {creatorName} · Chap {episodeNumber}
          </p>
        </div>
        <p className="mt-8 text-2xl font-semibold leading-10 text-zinc-100">
          {excerpt}
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <div className="grid gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950"
            type="button"
          >
            Đọc trọn chap
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100"
            type="button"
          >
            Vào truyện
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mockActions.map((action) => (
            <button
              className="min-h-11 rounded-lg border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200"
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
