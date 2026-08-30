export type GlobalAudioQueueItem = {
  audioItemId: string;
  storyId: string;
  storyHref: string;
  title: string;
  storyTitle: string;
  partNumber: number | null;
  externalAudioUrl: string;
  durationSeconds: number | null;
  coverImageUrl: string | null;
  authorDisplayName: string | null;
  authorUsername: string | null;
};

export type SleepTimerMode = { type: "off" } | { type: "minutes"; endsAt: number } | { type: "end_of_part" };

export type GlobalAudioPlayerState = {
  currentAudioItem: GlobalAudioQueueItem | null;
  queue: GlobalAudioQueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  sleepTimer: SleepTimerMode;
  error: string | null;
  isContinuousMode: boolean;
  isBackgroundCapable: boolean;
  isFullPlayerOpen: boolean;
};

export const GLOBAL_AUDIO_PROGRESS_KEY_PREFIX = "chapmee_audio_progress_";

export const defaultGlobalAudioPlayerState: GlobalAudioPlayerState = {
  currentAudioItem: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  sleepTimer: { type: "off" },
  error: null,
  isContinuousMode: true,
  isBackgroundCapable: false,
  isFullPlayerOpen: false
};

export function getGuestProgressKey(audioItemId: string): string {
  return `${GLOBAL_AUDIO_PROGRESS_KEY_PREFIX}${audioItemId}`;
}
