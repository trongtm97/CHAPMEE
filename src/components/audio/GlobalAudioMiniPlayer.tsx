"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function GlobalAudioMiniPlayer() {
  const { state, pause, resume, next, previous, stop, openFullPlayer } = useGlobalAudioPlayer();
  const item = state.currentAudioItem;

  const progressPercent = useMemo(() => {
    if (!state.duration || state.duration <= 0) return 0;
    return Math.max(0, Math.min(100, (state.currentTime / state.duration) * 100));
  }, [state.currentTime, state.duration]);

  if (!item) return null;

  return (
    <div className="fixed inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 md:bottom-4 md:right-4 md:left-auto md:w-[380px]">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={openFullPlayer}
          className="mb-2 block w-full text-left"
          aria-label="Mở trình phát đầy đủ"
        >
          <p className="truncate text-xs text-zinc-400">{item.storyTitle}</p>
          <p className="truncate text-sm font-semibold text-zinc-100">
            {item.partNumber != null ? `Phần ${item.partNumber}: ` : ""}
            {item.title}
          </p>
        </button>

        <div className="mb-2 h-1 w-full overflow-hidden rounded bg-zinc-800">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void previous()}
            className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 hover:bg-zinc-700"
            aria-label="Phần trước"
          >
            Trước
          </button>
          <button
            type="button"
            onClick={() => void (state.isPlaying ? pause() : resume())}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 hover:bg-zinc-700"
            aria-label={state.isPlaying ? "Tạm dừng audio" : "Phát audio"}
          >
            {state.isPlaying ? "Tạm dừng" : "Phát"}
          </button>
          <button
            type="button"
            onClick={() => void next()}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 hover:bg-zinc-700"
            aria-label="Phần tiếp theo"
          >
            Tiếp
          </button>
          <Link
            href={item.storyHref}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs text-white hover:bg-emerald-600"
            aria-label="Đọc truyện gốc"
          >
            Đọc truyện
          </Link>
          <button
            type="button"
            onClick={openFullPlayer}
            className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 hover:bg-zinc-700"
            aria-label="Mở danh sách audio"
          >
            Danh sách
          </button>
          <button
            type="button"
            onClick={stop}
            className="ml-auto rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
