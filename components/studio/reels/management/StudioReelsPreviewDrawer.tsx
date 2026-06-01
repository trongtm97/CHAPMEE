"use client";

import { ReelsPreview } from "@/components/studio/reels/ReelsPreview";
import type { ReelsStudioListItem } from "@/types/reels";

type StudioReelsPreviewDrawerProps = {
  authorName: string;
  item: ReelsStudioListItem | null;
  onClose: () => void;
};

export function StudioReelsPreviewDrawer({
  authorName,
  item,
  onClose
}: StudioReelsPreviewDrawerProps) {
  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <button aria-label="Đóng" className="absolute inset-0" onClick={onClose} type="button" />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-zinc-950 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">Xem trước Reels</h2>
            <p className="text-xs text-zinc-500">Đây là bản xem trước, không phải feed công khai.</p>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 px-3 text-sm text-zinc-300"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ReelsPreview
            backgroundImageUrl={item.backgroundImageUrl}
            body={item.body}
            creatorName={authorName}
            cta={item.cta ?? "Đọc tiếp"}
            episodeNumber={item.chapterNumber}
            episodeTitle={item.chapterTitle ?? ""}
            hook={item.hook}
            storySlug={item.storySlug}
            storyTitle={item.storyTitle}
          />
        </div>
      </div>
    </div>
  );
}
