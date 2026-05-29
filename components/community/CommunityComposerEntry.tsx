"use client";

import Link from "next/link";
import { useState } from "react";
import type { CommunityComposerMode } from "@/types/community";

const composerActions: {
  mode: CommunityComposerMode;
  label: string;
  typeParam: string;
}[] = [
  { mode: "post", label: "Viết bài", typeParam: "discussion" },
  { mode: "review", label: "Review", typeParam: "review" },
  { mode: "poll", label: "Poll", typeParam: "poll" },
  { mode: "ask_author", label: "Hỏi tác giả", typeParam: "discussion" }
];

type CommunityComposerEntryProps = {
  isLoggedIn: boolean;
};

export function CommunityComposerEntry({ isLoggedIn }: CommunityComposerEntryProps) {
  const [open, setOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<CommunityComposerMode>("post");
  const [storyId, setStoryId] = useState("");
  const [chapter, setChapter] = useState("");
  const [target, setTarget] = useState<"global" | "story" | "author">("story");
  const [spoiler, setSpoiler] = useState(false);

  const selected = composerActions.find((item) => item.mode === selectedMode)!;
  const loginNext = encodeURIComponent(
    `/community/new?type=${selected.typeParam}&target=${target}${storyId ? `&story=${storyId}` : ""}${chapter ? `&chapter=${chapter}` : ""}${spoiler ? "&spoiler=1" : ""}${selectedMode === "ask_author" ? "&ask_author=1" : ""}`
  );

  return (
    <>
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-zinc-100">Bạn muốn bàn về truyện nào?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {composerActions.map((item) => (
            <button
              className="tap-highlight flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-zinc-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/8"
              key={item.mode}
              onClick={() => {
                setSelectedMode(item.mode);
                setOpen(true);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <button
            aria-label="Đóng"
            className="absolute inset-0"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="relative z-10 max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0f141c] p-4 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-base font-black text-white">
                {selected.label} — chọn ngữ cảnh
              </h3>
              <button
                className="text-sm font-bold text-zinc-400"
                onClick={() => setOpen(false)}
                type="button"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <label className="block space-y-1.5">
                <span className="font-medium text-zinc-200">Truyện liên quan *</span>
                <input
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white outline-none focus:border-cyan-300/50"
                  onChange={(event) => setStoryId(event.target.value)}
                  placeholder="Nhập slug hoặc tên truyện (MVP)"
                  value={storyId}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-medium text-zinc-200">Chương (tuỳ chọn)</span>
                <input
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white outline-none focus:border-cyan-300/50"
                  onChange={(event) => setChapter(event.target.value)}
                  placeholder="VD: Chương 3"
                  value={chapter}
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="font-medium text-zinc-200">Đăng vào</legend>
                {(
                  [
                    ["story", "Nhóm truyện"],
                    ["author", "Nhóm tác giả"],
                    ["global", "Bảng tin chung"]
                  ] as const
                ).map(([value, label]) => (
                  <label className="flex items-center gap-2 text-zinc-300" key={value}>
                    <input
                      checked={target === value}
                      name="target"
                      onChange={() => setTarget(value)}
                      type="radio"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>

              <label className="flex items-center gap-2 text-zinc-300">
                <input
                  checked={spoiler}
                  onChange={(event) => setSpoiler(event.target.checked)}
                  type="checkbox"
                />
                Có spoiler
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {isLoggedIn ? (
                <Link
                  className="tap-highlight inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.1em] text-zinc-950"
                  href={`/community/new?type=${selected.typeParam}&target=${target}${storyId ? `&story=${encodeURIComponent(storyId)}` : ""}${chapter ? `&chapter=${encodeURIComponent(chapter)}` : ""}${spoiler ? "&spoiler=1" : ""}${selectedMode === "ask_author" ? "&ask_author=1" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  Tiếp tục soạn bài
                </Link>
              ) : (
                <Link
                  className="tap-highlight inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.1em] text-zinc-950"
                  href={`/login?next=${loginNext}`}
                  onClick={() => setOpen(false)}
                >
                  Đăng nhập để đăng
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
