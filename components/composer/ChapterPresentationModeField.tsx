"use client";

import { resolveChapterComposerMode } from "@/lib/composer/editor-state";
import type { ChapterPresentationSource } from "@/lib/composer/editor-state";
import { COMPOSER_MODE_LABELS } from "@/lib/composer/modes";
import { PRESENTATION_MODE_LABELS } from "@/lib/presentation/constants";
import type { PresentationMode } from "@/types/presentation";
import { STRUCTURED_PRESENTATION_MODES } from "@/lib/presentation/constants";

type ChapterPresentationModeFieldProps = {
  disabled?: boolean;
  storyMode: PresentationMode;
  value: ChapterPresentationSource;
  onChange: (value: ChapterPresentationSource) => void;
  useComposerUi: boolean;
  onUseComposerUiChange: (enabled: boolean) => void;
};

const OVERRIDE_OPTIONS: Array<{ value: ChapterPresentationSource; label: string }> = [
  { value: "story", label: "Theo truyện" },
  { value: "standard_prose", label: "Văn xuôi" },
  ...STRUCTURED_PRESENTATION_MODES.map((mode) => ({
    value: mode as ChapterPresentationSource,
    label: PRESENTATION_MODE_LABELS[mode]
  }))
];

export function ChapterPresentationModeField({
  disabled,
  onChange,
  onUseComposerUiChange,
  storyMode,
  useComposerUi,
  value
}: ChapterPresentationModeFieldProps) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <label className="block space-y-2 text-sm">
        <span className="font-semibold text-zinc-200">Cách trình bày chương</span>
        <select
          className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as ChapterPresentationSource)}
          value={value}
        >
          {OVERRIDE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.value === "story"
                ? ` (${PRESENTATION_MODE_LABELS[storyMode]})`
                : ""}
            </option>
          ))}
        </select>
      </label>

      {!useComposerUi ? (
        <button
          className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          disabled={disabled}
          onClick={() => onUseComposerUiChange(true)}
          type="button"
        >
          Chuyển sang Composer
        </button>
      ) : null}

      {useComposerUi ? (
        <p className="text-xs text-zinc-500">
          Đang soạn bằng Composer (
          {COMPOSER_MODE_LABELS[
            resolveChapterComposerMode(value, storyMode, null)
          ]}
          ).
        </p>
      ) : null}
    </div>
  );
}
