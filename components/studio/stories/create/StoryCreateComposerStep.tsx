"use client";

import { Input, Textarea } from "@/components/ui";
import { StudioStandaloneComposerField } from "@/components/studio/stories/StudioStandaloneComposerField";
import { presentationModeDescription } from "@/lib/taxonomy/presentation-labels";
import { isPresentationMode } from "@/lib/presentation/constants";
import type { StoryComposerPath } from "@/lib/studio/story-create-validation";
import type { PresentationMode } from "@/types/presentation";
import type { StoryStructureType } from "@/types/story-structure";

type PathOption = {
  value: StoryComposerPath;
  title: string;
  desc: string;
};

const CHAPTERED_OPTIONS: PathOption[] = [
  {
    value: "story_only",
    title: "Chỉ tạo truyện",
    desc: "Lưu khung truyện, thêm chương sau."
  },
  {
    value: "first_chapter_composer",
    title: "Tạo truyện & viết chương đầu",
    desc: "Tạo chương đầu và mở ChapMee Studio Composer."
  },
  {
    value: "first_chapter_plain",
    title: "Tạo truyện & nhập văn bản thường",
    desc: "Phù hợp nếu chỉ muốn viết văn xuôi đơn giản."
  }
];

const STANDALONE_OPTIONS: PathOption[] = [
  {
    value: "standalone_composer",
    title: "Viết ngay bằng Composer",
    desc: "Soạn nội dung chính bằng block phù hợp cách trình bày."
  },
  {
    value: "standalone_plain",
    title: "Viết văn bản thường",
    desc: "Soạn nhanh dạng văn xuôi, không dùng block."
  },
  {
    value: "standalone_draft_only",
    title: "Chỉ tạo bản nháp",
    desc: "Lưu thông tin truyện, soạn nội dung sau."
  }
];

type StoryCreateComposerStepProps = {
  composerModeLabel: string;
  composerPath: StoryComposerPath;
  disabled?: boolean;
  firstChapterTitle: string;
  onComposerPathChange: (path: StoryComposerPath) => void;
  onFirstChapterTitleChange: (value: string) => void;
  onStandaloneContentChange: (hasContent: boolean) => void;
  onStandalonePlainChange: (value: string) => void;
  presentationMode: string;
  standalonePlainText: string;
  structureType: StoryStructureType;
};

export function StoryCreateComposerStep({
  composerModeLabel,
  composerPath,
  disabled = false,
  firstChapterTitle,
  onComposerPathChange,
  onFirstChapterTitleChange,
  onStandaloneContentChange,
  onStandalonePlainChange,
  presentationMode,
  standalonePlainText,
  structureType
}: StoryCreateComposerStepProps) {
  const options =
    structureType === "standalone" ? STANDALONE_OPTIONS : CHAPTERED_OPTIONS;
  const presentationHint = presentationModeDescription(presentationMode);
  const resolvedPresentationMode = isPresentationMode(presentationMode)
    ? (presentationMode as PresentationMode)
    : "standard_prose";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          {structureType === "standalone" ? "Soạn nội dung" : "Bắt đầu viết"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {structureType === "standalone"
            ? "Truyện một phần — nội dung chính nằm trên truyện, không cần chương."
            : "Chọn bước tiếp theo sau khi tạo truyện."}{" "}
          Composer:{" "}
          <span className="text-cyan-300">{composerModeLabel}</span>
          {presentationHint ? ` — ${presentationHint}` : null}.
        </p>
      </div>

      <input name="post_create_path" type="hidden" value={composerPath} />

      <fieldset className="space-y-3">
        <legend className="sr-only">Lựa chọn sau khi tạo</legend>
        {options.map((opt) => (
          <label
            className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition ${
              composerPath === opt.value
                ? "border-cyan-400/40 bg-cyan-400/10"
                : "border-white/10 bg-zinc-950/50 hover:border-white/20"
            }`}
            key={opt.value}
          >
            <input
              checked={composerPath === opt.value}
              className="mt-1 accent-cyan-300"
              disabled={disabled}
              name="post_create_path_ui"
              onChange={() => onComposerPathChange(opt.value)}
              type="radio"
              value={opt.value}
            />
            <span>
              <span className="block text-sm font-semibold text-white">{opt.title}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{opt.desc}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {structureType === "chaptered" &&
      (composerPath === "first_chapter_composer" ||
        composerPath === "first_chapter_plain") ? (
        <Input
          disabled={disabled}
          label="Tiêu đề chương đầu (khuyến nghị)"
          name="first_chapter_title"
          onChange={(event) => onFirstChapterTitleChange(event.target.value)}
          placeholder="Chương 1"
          value={firstChapterTitle}
        />
      ) : null}

      {structureType === "standalone" && composerPath === "standalone_composer" ? (
        <StudioStandaloneComposerField
          onChange={({ hasContent }) => onStandaloneContentChange(hasContent)}
          presentationMode={resolvedPresentationMode}
        />
      ) : null}

      {structureType === "standalone" && composerPath === "standalone_plain" ? (
        <Textarea
          disabled={disabled}
          label="Nội dung văn bản"
          name="standalone_content"
          onChange={(event) => onStandalonePlainChange(event.target.value)}
          placeholder="Soạn nội dung truyện một phần…"
          rows={12}
          value={standalonePlainText}
        />
      ) : null}

      {structureType === "chaptered" && composerPath === "story_only" ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-zinc-500">
          Bạn có thể thêm chương và mở Composer ngay sau khi tạo truyện.
        </p>
      ) : null}
    </div>
  );
}
