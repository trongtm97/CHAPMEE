"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function GlobalAudioFullPlayer() {
  const {
    state,
    closeFullPlayer,
    pause,
    resume,
    next,
    previous,
    seek,
    setPlaybackRate,
    setSleepTimer,
    toggleContinuousMode,
    playAudioItem
  } = useGlobalAudioPlayer();

  const item = state.currentAudioItem;
  const queue = state.queue;

  const progressPercent = useMemo(() => {
    if (!state.duration || state.duration <= 0) return 0;
    return Math.max(0, Math.min(100, (state.currentTime / state.duration) * 100));
  }, [state.currentTime, state.duration]);

  if (!item || !state.isFullPlayerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
      <div className="mx-auto mt-4 h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 md:mt-8 md:h-[calc(100dvh-4rem)] md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Trình phát âm thanh</h2>
          <button
            type="button"
            onClick={closeFullPlayer}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
          >
            Đóng
          </button>
        </div>

        <div className="mb-4 flex items-start gap-4">
          {item.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverImageUrl} alt={item.storyTitle} className="h-24 w-24 rounded-lg object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-400">
              No cover
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm text-zinc-400">{item.storyTitle}</p>
            <p className="truncate text-base font-semibold">
              {item.partNumber != null ? `Phần ${item.partNumber}: ` : ""}
              {item.title}
            </p>
            <p className="text-xs text-zinc-500">
              {item.authorDisplayName ?? item.authorUsername ?? "ChapMee"}
            </p>
          </div>
        </div>

        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mb-4 flex items-center justify-between text-xs text-zinc-400">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(1, state.duration || 1)}
          step={1}
          value={Math.min(state.currentTime, Math.max(1, state.duration || 1))}
          onChange={(event) => seek(Number(event.target.value))}
          className="mb-5 w-full"
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void previous()} className="rounded-md bg-zinc-800 px-3 py-2 text-sm">
            Phần trước
          </button>
          <button
            type="button"
            onClick={() => void (state.isPlaying ? pause() : resume())}
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm text-white"
          >
            {state.isPlaying ? "Tạm dừng" : "Phát"}
          </button>
          <button type="button" onClick={() => void next()} className="rounded-md bg-zinc-800 px-3 py-2 text-sm">
            Phần tiếp
          </button>
          <Link href={item.storyHref} className="rounded-md bg-zinc-700 px-3 py-2 text-sm" aria-label="Đọc truyện gốc">
            Đọc truyện
          </Link>
          <Link href={item.storyHref} className="rounded-md bg-zinc-700 px-3 py-2 text-sm" aria-label="Mở trang truyện">
            Mở truyện
          </Link>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">Tốc độ phát</p>
          <div className="flex flex-wrap gap-2">
            {PLAYBACK_SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaybackRate(speed)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  state.playbackRate === speed ? "bg-emerald-700 text-white" : "bg-zinc-800"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">Hẹn giờ tắt</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSleepTimer(15)} className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm">
              15 phút
            </button>
            <button type="button" onClick={() => setSleepTimer(30)} className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm">
              30 phút
            </button>
            <button
              type="button"
              onClick={() => setSleepTimer("end_of_part")}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm"
            >
              Hết phần hiện tại
            </button>
            <button type="button" onClick={() => setSleepTimer("off")} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm">
              Tắt hẹn giờ
            </button>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2">
          <label className="text-sm">Nghe liên tục</label>
          <button
            type="button"
            onClick={toggleContinuousMode}
            className={`rounded-full px-3 py-1.5 text-xs ${
              state.isContinuousMode ? "bg-emerald-700 text-white" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {state.isContinuousMode ? "Bật" : "Tắt"}
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Hàng chờ audio</p>
          <div className="space-y-2">
            {queue.map((queueItem) => {
              const active = queueItem.audioItemId === item.audioItemId;
              return (
                <button
                  key={queueItem.audioItemId}
                  type="button"
                  onClick={() => void playAudioItem(queueItem, queue)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${
                    active ? "border-emerald-500 bg-emerald-900/30" : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <span className="truncate text-sm">
                    {queueItem.partNumber != null ? `Phần ${queueItem.partNumber}: ` : ""}
                    {queueItem.title}
                  </span>
                  {active ? <span className="text-xs text-emerald-400">Đang phát</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
