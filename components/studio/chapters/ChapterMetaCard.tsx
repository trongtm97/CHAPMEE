"use client";

import { Input } from "@/components/ui";
import { PublicCodeCopy } from "@/components/studio/import/PublicCodeCopy";
import { buildChapterUrlPreview } from "@/lib/chapters/chapter-url-preview";import { slugifyVietnamese } from "@/lib/seo/slugify-vi";

type ChapterMetaCardProps = {
  chapterPublicCode?: string | null;
  disabled?: boolean;
  episodeNumber: number;
  onEpisodeNumberChange: (value: number) => void;
  onTitleChange: (value: string) => void;
  storyPublicCode?: string | null;
  storySlug: string;
  title: string;
  titleError?: string | null;
  numberError?: string | null;
};

export function ChapterMetaCard({
  chapterPublicCode,
  disabled = false,  episodeNumber,
  numberError,
  onEpisodeNumberChange,
  onTitleChange,
  storyPublicCode,
  storySlug,
  title,
  titleError
}: ChapterMetaCardProps) {
  const suggestedSlug = slugifyVietnamese(title.trim()) || "chuong-moi";
  const urlPreview = buildChapterUrlPreview({
    episodeNumber,
    storyPublicCode,
    storySlug
  });

  return (
    <section
      className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 sm:p-5"
      data-chapter-field="meta"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Thông tin chương
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
        <div data-chapter-field="number">
          <Input
            disabled={disabled}
            error={numberError ?? undefined}
            label="Số chương"
            min={1}
            name="episode_number"
            onChange={(event) => {
              const next = Math.max(1, Math.floor(Number(event.target.value) || 1));
              onEpisodeNumberChange(next);
            }}
            required
            step={1}
            type="number"
            value={episodeNumber}
          />
        </div>

        <div data-chapter-field="title">
          <Input
            disabled={disabled}
            error={titleError ?? undefined}
            label="Tiêu đề chương"
            name="title"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Tiêu đề chương (tuỳ chọn)"
            value={title}
          />
        </div>
      </div>

      {chapterPublicCode ? (
        <div className="mt-4">
          <PublicCodeCopy code={chapterPublicCode} label="Mã chương (chapter_code)" />
        </div>
      ) : (
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Mã chương (chapter_code) được cấp sau khi lưu lần đầu — dùng cho nhập/cập nhật CSV hàng
          loạt.
        </p>
      )}

      <details className="mt-4 rounded-xl border border-white/10 bg-black/20">        <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-zinc-300">
          Đường dẫn &amp; SEO nâng cao
        </summary>
        <div className="space-y-3 border-t border-white/10 px-3 py-3 text-sm">
          <p className="text-xs leading-5 text-zinc-500">
            Slug chương tự sinh khi xuất bản. Bạn không cần chỉnh thủ công trừ khi có yêu cầu
            đặc biệt.
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-zinc-400">Slug gợi ý</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-400"
              disabled
              readOnly
              value={suggestedSlug}
            />
          </label>
          <p className="break-all text-xs text-cyan-300/90">{urlPreview}</p>
        </div>
      </details>
    </section>
  );
}
