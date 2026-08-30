"use client";

import { useMemo } from "react";
import { ReelsPreview } from "@/components/studio/reels/ReelsPreview";
import { Textarea } from "@/components/ui";
import { generateReelsSuggestionsFromChapter } from "@/lib/reels/generate-reels-suggestions";
import { REELS_BODY_MAX, REELS_HOOK_MAX } from "@/types/reels";
import type { ChapterReelsPromoDraft } from "@/types/chapter-reels-promo";

type ChapterReelsPromoSectionProps = {
  authorDisplayName?: string | null;
  chapterContent: string;
  chapterTitle: string;
  disabled?: boolean;
  episodeNumber: number;
  genreName?: string | null;
  onChange: (value: ChapterReelsPromoDraft) => void;
  promo: ChapterReelsPromoDraft;
  reelStatus?: "draft" | "published" | "scheduled" | "hidden" | null;
  storyCoverUrl?: string | null;
  storyPublicCode?: string | null;
  storySlug: string;
  storyTitle: string;
};

export function ChapterReelsPromoSection({
  authorDisplayName,
  chapterContent,
  chapterTitle,
  disabled = false,
  episodeNumber,
  genreName,
  onChange,
  promo,
  reelStatus,
  storyCoverUrl = null,
  storyPublicCode,
  storySlug,
  storyTitle
}: ChapterReelsPromoSectionProps) {
  const statusLabel =
    reelStatus === "published"
      ? "Đã đăng"
      : reelStatus === "scheduled"
        ? "Đã lên lịch"
        : reelStatus === "draft"
          ? "Nháp"
          : null;

  const canSuggest = chapterContent.trim().length >= 40;

  function patch(partial: Partial<ChapterReelsPromoDraft>) {
    onChange({ ...promo, ...partial });
  }

  function applyFromChapter() {
    const suggestions = generateReelsSuggestionsFromChapter({
      chapterTitle,
      content: chapterContent,
      storyTitle
    });
    const picked =
      suggestions.chapter_start ??
      suggestions.dialogue ??
      suggestions.question ??
      suggestions.ending;

    if (!picked) {
      return;
    }

    onChange({
      enabled: true,
      body: picked.body,
      hook: picked.hook || chapterTitle,
      sourceTextEnd: picked.sourceTextEnd,
      sourceTextStart: picked.sourceTextStart,
      sourceType: picked.sourceType
    });
  }

  const previewHook = useMemo(
    () => promo.hook.trim() || chapterTitle.trim() || "Hook",
    [chapterTitle, promo.hook]
  );

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Reels quảng bá
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Tuỳ chọn — đồng bộ với trạng thái chương (nháp / công khai).
          </p>
        </div>
        {statusLabel ? (
          <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase text-cyan-100">
            {statusLabel}
          </span>
        ) : null}
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
        <input
          checked={promo.enabled}
          className="size-4 rounded border-white/20 bg-zinc-900"
          disabled={disabled}
          onChange={(event) => patch({ enabled: event.target.checked })}
          type="checkbox"
        />
        Tạo Reels cho chương này
      </label>

      {promo.enabled ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.08] disabled:opacity-50"
              disabled={disabled || !canSuggest}
              onClick={applyFromChapter}
              type="button"
            >
              Lấy từ chương
            </button>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-zinc-400">Hook</span>
            <input
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
              disabled={disabled}
              maxLength={REELS_HOOK_MAX}
              onChange={(event) => patch({ hook: event.target.value })}
              placeholder={chapterTitle || "Tiêu đề chương"}
              value={promo.hook}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-zinc-400">Đoạn Reels</span>
            <Textarea
              disabled={disabled}
              maxLength={REELS_BODY_MAX}
              onChange={(event) => patch({ body: event.target.value })}
              placeholder="Dán đoạn trích hấp dẫn cho Reels..."
              rows={5}
              value={promo.body}
            />
            <p className="text-right text-[0.68rem] text-zinc-500">
              {promo.body.length}/{REELS_BODY_MAX}
            </p>
          </label>

          <ReelsPreview
            backgroundImageUrl={storyCoverUrl}
            contentSource="chapter"
            creatorName={authorDisplayName ?? "Tác giả"}
            cta="Đọc tiếp"
            episodeNumber={episodeNumber}
            episodeTitle={chapterTitle}
            genreName={genreName}
            hook={previewHook}
            body={promo.body}
            storyPublicCode={storyPublicCode ?? undefined}
            storySlug={storySlug}
            storyTitle={storyTitle}
          />
        </div>
      ) : null}
    </section>
  );
}
