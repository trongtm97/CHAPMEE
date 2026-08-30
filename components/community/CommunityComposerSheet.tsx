"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PostTypeOption = {
  label: string;
  typeParam: string;
  askAuthor?: boolean;
};

const postTypes: PostTypeOption[] = [
  { label: "Thảo luận", typeParam: "discussion" },
  { label: "Review truyện", typeParam: "review" },
  { label: "Bình chọn", typeParam: "poll" },
  { label: "Hỏi tác giả", typeParam: "discussion", askAuthor: true },
  { label: "Thử thách", typeParam: "challenge" }
];

type CommunityComposerPreset = {
  askAuthor?: boolean;
  typeParam?: string;
};

type CommunityComposerSheetProps = {
  open: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  preset?: CommunityComposerPreset | null;
};

function resolvePresetOption(preset?: CommunityComposerPreset | null) {
  if (!preset?.typeParam) {
    return postTypes[0];
  }

  return (
    postTypes.find(
      (option) =>
        option.typeParam === preset.typeParam &&
        Boolean(option.askAuthor) === Boolean(preset.askAuthor)
    ) ??
    postTypes.find((option) => option.typeParam === preset.typeParam) ??
    postTypes[0]
  );
}

export function CommunityComposerSheet({
  isLoggedIn,
  onClose,
  open,
  preset = null
}: CommunityComposerSheetProps) {
  const [step, setStep] = useState<"type" | "context">("type");
  const [selected, setSelected] = useState<PostTypeOption>(postTypes[0]);
  const [storyId, setStoryId] = useState("");
  const [chapter, setChapter] = useState("");
  const [spoiler, setSpoiler] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextSelected = resolvePresetOption(preset);
    setSelected(nextSelected);
    setStep(preset?.typeParam ? "context" : "type");
    setStoryId("");
    setChapter("");
    setSpoiler(false);
  }, [open, preset]);

  if (!open) {
    return null;
  }

  function buildHref() {
    const params = new URLSearchParams();
    params.set("type", selected.typeParam);
    if (storyId) {
      params.set("story", storyId);
    }
    if (chapter) {
      params.set("chapter", chapter);
    }
    if (spoiler) {
      params.set("spoiler", "1");
    }
    if (selected.askAuthor) {
      params.set("ask_author", "1");
    }
    return `/community/new?${params.toString()}`;
  }

  function handleClose() {
    setStep("type");
    setSelected(postTypes[0]);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <button aria-label="Đóng" className="absolute inset-0" onClick={handleClose} type="button" />
      <div className="relative z-10 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0f141c] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-white">
            {step === "type" ? "Bạn muốn đăng gì?" : "Chọn ngữ cảnh"}
          </h3>
          <button className="text-xs font-bold text-zinc-500" onClick={handleClose} type="button">
            Đóng
          </button>
        </div>

        {step === "type" ? (
          <div className="grid gap-2">
            {postTypes.map((option) => (
              <button
                className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-left text-sm font-semibold text-zinc-100 hover:border-cyan-300/30"
                key={option.label}
                onClick={() => {
                  setSelected(option);
                  setStep("context");
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-zinc-500">Loại: {selected.label}</p>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">Truyện liên quan</span>
              <input
                className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                onChange={(event) => setStoryId(event.target.value)}
                placeholder="Tên hoặc slug truyện"
                value={storyId}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">Chương (tuỳ chọn)</span>
              <input
                className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                onChange={(event) => setChapter(event.target.value)}
                placeholder="VD: 12"
                value={chapter}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                checked={spoiler}
                onChange={(event) => setSpoiler(event.target.checked)}
                type="checkbox"
              />
              Có spoiler
            </label>
            <div className="flex gap-2 pt-1">
              <button
                className="min-h-10 flex-1 rounded-full border border-white/10 text-xs font-bold text-zinc-400"
                onClick={() => setStep("type")}
                type="button"
              >
                Quay lại
              </button>
              {isLoggedIn ? (
                <Link
                  className="flex min-h-10 flex-[2] items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-zinc-950"
                  href={buildHref()}
                  onClick={handleClose}
                >
                  Tiếp tục
                </Link>
              ) : (
                <Link
                  className="flex min-h-10 flex-[2] items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-zinc-950"
                  href={`/login?next=${encodeURIComponent(buildHref())}`}
                  onClick={handleClose}
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
