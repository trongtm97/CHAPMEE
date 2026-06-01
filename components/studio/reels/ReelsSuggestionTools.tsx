"use client";

import { Button } from "@/components/ui";
import {
  generateReelsSuggestionFromStoryDescription,
  generateReelsSuggestionsFromChapter
} from "@/lib/reels/generate-reels-suggestions";
import type { ReelsSourceType, ReelsSuggestionResult } from "@/types/reels";

type ReelsSuggestionToolsProps = {
  chapterContent?: string | null;
  chapterTitle?: string | null;
  storyDescription?: string | null;
  storyTitle?: string;
  onApply: (result: ReelsSuggestionResult) => void;
};

export function ReelsSuggestionTools({
  chapterContent,
  chapterTitle,
  onApply,
  storyDescription,
  storyTitle
}: ReelsSuggestionToolsProps) {
  if (!chapterContent?.trim() && !storyDescription?.trim()) {
    return null;
  }

  function applyFromChapter(type: keyof ReturnType<typeof generateReelsSuggestionsFromChapter>) {
    if (!chapterContent?.trim()) {
      return;
    }

    const suggestions = generateReelsSuggestionsFromChapter({
      chapterTitle,
      content: chapterContent,
      storyTitle
    });
    const result = suggestions[type];

    if (result) {
      onApply(result);
    }
  }

  function applyFromStoryDescription() {
    if (!storyDescription?.trim() || !storyTitle) {
      return;
    }

    const result = generateReelsSuggestionFromStoryDescription({
      description: storyDescription,
      storyTitle
    });

    if (result) {
      onApply(result);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-100">Lấy đoạn từ chương</p>
        <p className="mt-1 text-xs text-zinc-500">
          Chỉ trích từ nội dung có sẵn — bạn vẫn cần xác nhận trước khi lưu hoặc đăng.
        </p>
      </div>

      {chapterContent?.trim() ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => applyFromChapter("chapter_start")}
            type="button"
            variant="secondary"
          >
            Gợi ý đoạn mở đầu
          </Button>
          <Button
            onClick={() => applyFromChapter("dialogue")}
            type="button"
            variant="secondary"
          >
            Gợi ý đoạn hội thoại
          </Button>
          <Button
            onClick={() => applyFromChapter("question")}
            type="button"
            variant="secondary"
          >
            Gợi ý đoạn có câu hỏi
          </Button>
          <Button
            onClick={() => applyFromChapter("ending")}
            type="button"
            variant="secondary"
          >
            Gợi ý đoạn cuối chương
          </Button>
        </div>
      ) : null}

      {!chapterContent?.trim() && storyDescription?.trim() ? (
        <Button onClick={applyFromStoryDescription} type="button" variant="secondary">
          Lấy từ mô tả truyện
        </Button>
      ) : null}

      {/* TODO: Tạo từ đoạn đã chọn — cần text selection trong chapter viewer */}
    </div>
  );
}

export type { ReelsSourceType };
