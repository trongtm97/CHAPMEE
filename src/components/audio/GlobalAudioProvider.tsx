"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { usePathname } from "next/navigation";
import {
  defaultGlobalAudioPlayerState,
  type GlobalAudioPlayerState,
  type GlobalAudioQueueItem,
  type SleepTimerMode
} from "@/src/lib/audio/audio-player-store";
import {
  getListeningProgressAction,
  markAudioCompletedAction,
  saveAudioProgressAction
} from "@/app/actions/audio-items";
import {
  markGuestAudioCompleted,
  pickResumeSeconds,
  readGuestAudioProgress,
  writeGuestAudioProgress
} from "@/src/lib/audio/audio-player-progress";
import { pauseEmbeddedMedia } from "@/src/lib/media/global-media-coordinator";
import { GlobalAudioMiniPlayer } from "@/src/components/audio/GlobalAudioMiniPlayer";
import { GlobalAudioFullPlayer } from "@/src/components/audio/GlobalAudioFullPlayer";

type GlobalAudioPlayerContextValue = {
  state: GlobalAudioPlayerState;
  playAudioItem: (
    audioItem: GlobalAudioQueueItem,
    queue?: GlobalAudioQueueItem[],
    fromBeginning?: boolean
  ) => Promise<void>;
  playQueue: (
    queue: GlobalAudioQueueItem[],
    startAudioItemId?: string,
    fromBeginning?: boolean
  ) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  stop: () => void;
  toggleContinuousMode: () => void;
  setSleepTimer: (value: number | "end_of_part" | "off") => void;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
};

const GlobalAudioPlayerContext = createContext<GlobalAudioPlayerContextValue | null>(null);

function isBrowserVisible() {
  return typeof document !== "undefined" && document.visibilityState === "visible";
}

function buildProgressFormData(item: GlobalAudioQueueItem, currentTime: number, duration: number, playbackRate: number) {
  const formData = new FormData();
  formData.set("story_id", item.storyId);
  formData.set("audio_item_id", item.audioItemId);
  formData.set("current_time_seconds", String(Math.max(0, Math.floor(currentTime))));
  formData.set("duration_seconds", String(Math.max(0, Math.floor(duration || 0))));
  formData.set("playback_rate", String(playbackRate));
  return formData;
}

export function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressSaveTimerRef = useRef<number | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const userInteractedRef = useRef(false);

  const [state, setState] = useState<GlobalAudioPlayerState>({
    ...defaultGlobalAudioPlayerState,
    isBackgroundCapable: typeof document !== "undefined" && "hidden" in document
  });

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current != null) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  const saveProgress = useCallback(
    async (force = false) => {
      const item = state.currentAudioItem;
      const audio = audioRef.current;
      if (!item || !audio) return;
      const currentTime = audio.currentTime || state.currentTime || 0;
      const duration = audio.duration || state.duration || 0;
      const playbackRate = audio.playbackRate || state.playbackRate;

      if (!force && currentTime <= 0) return;

      try {
        const result = await saveAudioProgressAction(
          buildProgressFormData(item, currentTime, duration, playbackRate)
        );
        if (!result.ok) {
          writeGuestAudioProgress(item.audioItemId, {
            storyId: item.storyId,
            currentTime: Math.floor(currentTime),
            duration: duration > 0 ? Math.floor(duration) : null,
            playbackRate
          });
        }
      } catch {
        writeGuestAudioProgress(item.audioItemId, {
          storyId: item.storyId,
          currentTime: Math.floor(currentTime),
          duration: duration > 0 ? Math.floor(duration) : null,
          playbackRate
        });
      }
    },
    [state.currentAudioItem, state.currentTime, state.duration, state.playbackRate]
  );

  const attachSource = useCallback((item: GlobalAudioQueueItem) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src !== item.externalAudioUrl) {
      audio.src = item.externalAudioUrl;
      audio.load();
    }
  }, []);

  const applyPendingSeek = useCallback(() => {
    const audio = audioRef.current;
    const seekTo = pendingSeekRef.current;
    if (!audio || seekTo == null || seekTo <= 0) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const clamped = duration > 0 ? Math.min(seekTo, Math.max(0, duration - 1)) : seekTo;
    audio.currentTime = clamped;
    pendingSeekRef.current = null;
    setState((prev) => ({
      ...prev,
      currentTime: audio.currentTime,
      duration: duration > 0 ? duration : prev.duration
    }));
  }, []);

  const resolvePlaybackStartSeconds = useCallback(
    async (item: GlobalAudioQueueItem, fromBeginning: boolean) => {
      if (fromBeginning) return 0;

      try {
        const result = await getListeningProgressAction(item.audioItemId);
        if (result.ok && result.data) {
          const data = result.data as {
            storyId: string;
            currentTimeSeconds: number;
            durationSeconds: number | null;
            completedAt: string | null;
          };
          if (data.storyId === item.storyId) {
            const resume = pickResumeSeconds(
              data.currentTimeSeconds,
              data.durationSeconds ?? item.durationSeconds,
              data.completedAt
            );
            if (resume > 0) return resume;
          }
        }
      } catch {
        // fall through to guest storage
      }

      const guest = readGuestAudioProgress(item.audioItemId);
      if (guest?.storyId === item.storyId && !guest.completed) {
        return pickResumeSeconds(guest.currentTime, guest.duration ?? item.durationSeconds);
      }
      return 0;
    },
    []
  );

  const applyMediaSession = useCallback((item: GlobalAudioQueueItem | null) => {
    if (!("mediaSession" in navigator) || !item) {
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title,
        artist: item.authorDisplayName ?? item.authorUsername ?? item.storyTitle,
        album: "ChapMee",
        artwork: item.coverImageUrl
          ? [
              { src: item.coverImageUrl, sizes: "96x96", type: "image/png" },
              { src: item.coverImageUrl, sizes: "192x192", type: "image/png" }
            ]
          : undefined
      });
    } catch {
      return;
    }
  }, []);

  const playAudioItem = useCallback(
    async (audioItem: GlobalAudioQueueItem, queue?: GlobalAudioQueueItem[], fromBeginning = false) => {
      if (!audioItem.externalAudioUrl) {
        setState((prev) => ({ ...prev, error: "Audio URL không hợp lệ." }));
        return;
      }

      const activeQueue = (queue ?? [audioItem]).filter((item) => Boolean(item.externalAudioUrl));
      const index = activeQueue.findIndex((item) => item.audioItemId === audioItem.audioItemId);
      const currentIndex = index >= 0 ? index : 0;
      const current = activeQueue[currentIndex];
      pauseEmbeddedMedia();

      const startSeconds = await resolvePlaybackStartSeconds(current, fromBeginning);
      pendingSeekRef.current = startSeconds > 0 ? startSeconds : null;

      attachSource(current);
      applyMediaSession(current);

      setState((prev) => ({
        ...prev,
        currentAudioItem: current,
        queue: activeQueue,
        currentIndex,
        error: null,
        isPlaying: true,
        currentTime: startSeconds > 0 ? startSeconds : 0
      }));

      const audio = audioRef.current;
      if (!audio) return;
      if (audio.readyState >= 1) {
        applyPendingSeek();
      }
      userInteractedRef.current = true;
      try {
        await audio.play();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          error: error instanceof Error ? error.message : "Không thể phát audio."
        }));
      }
    },
    [applyMediaSession, applyPendingSeek, attachSource, resolvePlaybackStartSeconds]
  );

  const playQueue = useCallback(
    async (queue: GlobalAudioQueueItem[], startAudioItemId?: string, fromBeginning = false) => {
      const externalOnlyQueue = queue.filter((item) => Boolean(item.externalAudioUrl));
      if (externalOnlyQueue.length === 0) {
        setState((prev) => ({ ...prev, error: "Không có external audio để phát." }));
        return;
      }
      const target =
        externalOnlyQueue.find((item) => item.audioItemId === startAudioItemId) ?? externalOnlyQueue[0];
      await playAudioItem(target, externalOnlyQueue, fromBeginning);
    },
    [playAudioItem]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    void saveProgress(true);
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [saveProgress]);

  const resume = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !state.currentAudioItem) return;
    userInteractedRef.current = true;
    pauseEmbeddedMedia();
    try {
      await audio.play();
      setState((prev) => ({ ...prev, isPlaying: true, error: null }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        error: error instanceof Error ? error.message : "Không thể tiếp tục phát."
      }));
    }
  }, [state.currentAudioItem]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    clearSleepTimer();
    setState((prev) => ({
      ...prev,
      ...defaultGlobalAudioPlayerState,
      isBackgroundCapable: prev.isBackgroundCapable
    }));
  }, [clearSleepTimer]);

  const goToQueueIndex = useCallback(
    async (nextIndex: number) => {
      const queue = state.queue;
      if (nextIndex < 0 || nextIndex >= queue.length) return;
      await playAudioItem(queue[nextIndex], queue);
    },
    [playAudioItem, state.queue]
  );

  const next = useCallback(async () => {
    await goToQueueIndex(state.currentIndex + 1);
  }, [goToQueueIndex, state.currentIndex]);

  const previous = useCallback(async () => {
    await goToQueueIndex(state.currentIndex - 1);
  }, [goToQueueIndex, state.currentIndex]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || Number.MAX_SAFE_INTEGER));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.75, Math.min(rate, 2));
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = clamped;
    }
    setState((prev) => ({ ...prev, playbackRate: clamped }));
  }, []);

  const toggleContinuousMode = useCallback(() => {
    setState((prev) => ({ ...prev, isContinuousMode: !prev.isContinuousMode }));
  }, []);

  const setSleepTimer = useCallback(
    (value: number | "end_of_part" | "off") => {
      clearSleepTimer();
      if (value === "off") {
        setState((prev) => ({ ...prev, sleepTimer: { type: "off" } }));
        return;
      }
      if (value === "end_of_part") {
        setState((prev) => ({ ...prev, sleepTimer: { type: "end_of_part" } }));
        return;
      }

      const endsAt = Date.now() + value * 60_000;
      sleepTimerRef.current = window.setTimeout(() => {
        pause();
      }, value * 60_000);
      setState((prev) => ({ ...prev, sleepTimer: { type: "minutes", endsAt } }));
    },
    [clearSleepTimer, pause]
  );

  const openFullPlayer = useCallback(() => {
    setState((prev) => ({ ...prev, isFullPlayerOpen: true }));
  }, []);

  const closeFullPlayer = useCallback(() => {
    setState((prev) => ({ ...prev, isFullPlayerOpen: false }));
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime || 0,
        duration: Number.isFinite(audio.duration) ? audio.duration : prev.duration
      }));
    };
    const handleLoaded = () => {
      applyPendingSeek();
      setState((prev) => ({
        ...prev,
        duration: Number.isFinite(audio.duration) ? audio.duration : prev.duration
      }));
    };
    const handleError = () => {
      setState((prev) => ({
        ...prev,
        error: "Không thể tải audio từ URL này.",
        isPlaying: false
      }));
    };
    const handleEnded = async () => {
      void saveProgress(true);
      const item = state.currentAudioItem;
      const audioEl = audioRef.current;
      if (item && audioEl && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
        const ratio = audioEl.currentTime / audioEl.duration;
        if (ratio >= 0.92) {
          const formData = new FormData();
          formData.set("audio_item_id", item.audioItemId);
          void markAudioCompletedAction(formData).catch(() => {
            markGuestAudioCompleted(item.audioItemId, item.storyId);
          });
          markGuestAudioCompleted(item.audioItemId, item.storyId);
        }
      }
      if (state.sleepTimer.type === "end_of_part") {
        pause();
        return;
      }
      if (state.isContinuousMode && state.currentIndex + 1 < state.queue.length) {
        await goToQueueIndex(state.currentIndex + 1);
        return;
      }
      stop();
    };
    const handlePlay = () => setState((prev) => ({ ...prev, isPlaying: true }));
    const handlePause = () => setState((prev) => ({ ...prev, isPlaying: false }));

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [
    applyPendingSeek,
    goToQueueIndex,
    pause,
    saveProgress,
    state.currentIndex,
    state.isContinuousMode,
    state.queue.length,
    state.sleepTimer.type,
    stop
  ]);

  useEffect(() => {
    if (progressSaveTimerRef.current != null) {
      window.clearInterval(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }
    if (!state.currentAudioItem) return;
    progressSaveTimerRef.current = window.setInterval(() => {
      void saveProgress(false);
    }, 20_000);
    return () => {
      if (progressSaveTimerRef.current != null) {
        window.clearInterval(progressSaveTimerRef.current);
      }
    };
  }, [saveProgress, state.currentAudioItem]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!isBrowserVisible()) {
        void saveProgress(true);
      }
    };
    const handleBeforeUnload = () => {
      void saveProgress(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveProgress]);

  useEffect(() => {
    void saveProgress(true);
  }, [pathname, saveProgress]);

  useEffect(() => {
    if (!state.currentAudioItem || !("mediaSession" in navigator)) {
      return;
    }
    const withGuard = (fn: () => void | Promise<void>) => () => {
      try {
        void fn();
      } catch {
        // no-op
      }
    };

    navigator.mediaSession.setActionHandler("play", withGuard(resume));
    navigator.mediaSession.setActionHandler("pause", withGuard(pause));
    navigator.mediaSession.setActionHandler("previoustrack", withGuard(previous));
    navigator.mediaSession.setActionHandler("nexttrack", withGuard(next));
    navigator.mediaSession.setActionHandler("seekbackward", withGuard(() => seek((audioRef.current?.currentTime ?? 0) - 10)));
    navigator.mediaSession.setActionHandler("seekforward", withGuard(() => seek((audioRef.current?.currentTime ?? 0) + 10)));
    navigator.mediaSession.setActionHandler("seekto", ((details: MediaSessionActionDetails) => {
      if (typeof details.seekTime === "number") {
        seek(details.seekTime);
      }
    }) as MediaSessionActionHandler);
  }, [next, pause, previous, resume, seek, state.currentAudioItem]);

  const value = useMemo<GlobalAudioPlayerContextValue>(
    () => ({
      state,
      playAudioItem,
      playQueue,
      pause,
      resume,
      next,
      previous,
      seek,
      setPlaybackRate,
      stop,
      toggleContinuousMode,
      setSleepTimer,
      openFullPlayer,
      closeFullPlayer
    }),
    [
      closeFullPlayer,
      next,
      openFullPlayer,
      pause,
      playAudioItem,
      playQueue,
      previous,
      resume,
      seek,
      setPlaybackRate,
      setSleepTimer,
      state,
      stop,
      toggleContinuousMode
    ]
  );

  return (
    <GlobalAudioPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" />
      <GlobalAudioMiniPlayer />
      <GlobalAudioFullPlayer />
    </GlobalAudioPlayerContext.Provider>
  );
}

export function useGlobalAudioPlayer() {
  const context = useContext(GlobalAudioPlayerContext);
  if (!context) {
    throw new Error("useGlobalAudioPlayer phải được dùng bên trong GlobalAudioProvider.");
  }
  return context;
}
