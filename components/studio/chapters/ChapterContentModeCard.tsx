"use client";

import { useState } from "react";
import { COMPOSER_MODE_LABELS } from "@/lib/composer/modes";
import { resolveChapterComposerMode } from "@/lib/composer/editor-state";
import type { ChapterPresentationSource } from "@/lib/composer/editor-state";
import { PRESENTATION_MODE_LABELS } from "@/lib/presentation/constants";
import { STRUCTURED_PRESENTATION_MODES } from "@/lib/presentation/constants";
import type { PresentationMode } from "@/types/presentation";

type ChapterContentModeCardProps = {
  disabled?: boolean;
  onPresentationChange: (source: ChapterPresentationSource) => void;
  onSwitchToComposer: () => void;
  onSwitchToPlain: () => void;
  presentationSource: ChapterPresentationSource;
  storyMode: PresentationMode;
  useComposerUi: boolean;
};

const OVERRIDE_OPTIONS: Array<{ value: ChapterPresentationSource; label: string }> = [
  { value: "story", label: "Theo truyện" },
  { value: "standard_prose", label: "Văn xuôi" },
  ...STRUCTURED_PRESENTATION_MODES.map((mode) => ({
    value: mode as ChapterPresentationSource,
    label: PRESENTATION_MODE_LABELS[mode]
  }))
];

export function ChapterContentModeCard({
  disabled = false,
  onPresentationChange,
  onSwitchToComposer,
  onSwitchToPlain,
  presentationSource,
  storyMode,
  useComposerUi
}: ChapterContentModeCardProps) {
  const [confirmComposerOpen, setConfirmComposerOpen] = useState(false);
  const [confirmPlainOpen, setConfirmPlainOpen] = useState(false);

  const composerLabel =
    COMPOSER_MODE_LABELS[
      resolveChapterComposerMode(presentationSource, storyMode, null)
    ];

  function requestComposer() {
    if (useComposerUi) {
      return;
    }
    setConfirmComposerOpen(true);
  }

  function requestPlain() {
    if (!useComposerUi) {
      return;
    }
    setConfirmPlainOpen(true);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Kiểu soạn nội dung
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup">
        <button
          aria-checked={!useComposerUi}
          className={`rounded-xl border p-4 text-left transition ${
            !useComposerUi
              ? "border-cyan-400/40 bg-cyan-400/10 ring-1 ring-cyan-400/30"
              : "border-white/10 bg-zinc-950/40 hover:border-white/20"
          }`}
          disabled={disabled}
          onClick={requestPlain}
          role="radio"
          type="button"
        >
          <p className="font-semibold text-white">Văn bản thường</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Truyện chữ, văn xuôi truyền thống. Editor nhanh, chèn ảnh và mẫu cơ bản.
          </p>
        </button>

        <button
          aria-checked={useComposerUi}
          className={`rounded-xl border p-4 text-left transition ${
            useComposerUi
              ? "border-violet-400/40 bg-violet-400/10 ring-1 ring-violet-400/30"
              : "border-white/10 bg-zinc-950/40 hover:border-white/20"
          }`}
          disabled={disabled}
          onClick={requestComposer}
          role="radio"
          type="button"
        >
          <p className="font-semibold text-white">Studio Composer</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Chat story, hồ sơ vụ án, nhật ký, litRPG — block theo format truyện.
          </p>
          {useComposerUi ? (
            <p className="mt-2 text-xs font-medium text-violet-200">{composerLabel}</p>
          ) : null}
        </button>
      </div>

      <details className="mt-4 rounded-xl border border-white/10 bg-black/20">
        <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-zinc-300">
          Cách trình bày chương
        </summary>
        <div className="border-t border-white/10 px-3 py-3">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-zinc-300">Format hiển thị</span>
            <select
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
              disabled={disabled}
              onChange={(event) =>
                onPresentationChange(event.target.value as ChapterPresentationSource)
              }
              value={presentationSource}
            >
              {OVERRIDE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                  {opt.value === "story" ? ` (${PRESENTATION_MODE_LABELS[storyMode]})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      {confirmComposerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-950 p-5 sm:rounded-2xl">
            <h3 className="text-lg font-bold text-white">Chuyển sang Composer?</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Nội dung văn bản hiện tại sẽ được chuyển thành block văn bản. Bạn có thể chỉnh
              tiếp trong Composer. Bản nháp hiện tại sẽ được lưu trước khi chuyển.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5"
                onClick={() => setConfirmComposerOpen(false)}
                type="button"
              >
                Huỷ
              </button>
              <button
                className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400"
                onClick={() => {
                  setConfirmComposerOpen(false);
                  onSwitchToComposer();
                }}
                type="button"
              >
                Chuyển sang Composer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmPlainOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-950 p-5 sm:rounded-2xl">
            <h3 className="text-lg font-bold text-white">Chuyển về văn bản thường?</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Một số block đặc thù có thể không hiển thị đầy đủ trong văn bản thường. Nội dung
              sẽ dùng bản text fallback nếu có.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5"
                onClick={() => setConfirmPlainOpen(false)}
                type="button"
              >
                Huỷ
              </button>
              <button
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
                onClick={() => {
                  setConfirmPlainOpen(false);
                  onSwitchToPlain();
                }}
                type="button"
              >
                Chuyển về văn bản
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
