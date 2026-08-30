export type PomodoroMode = "focus" | "short_break" | "long_break";

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoSwitchMode: boolean;
  autoStartNextSession: boolean;
  soundEnabled: boolean;
  browserNotificationEnabled: boolean;
}

export interface PomodoroState {
  mode: PomodoroMode;
  isRunning: boolean;
  isPaused: boolean;
  remainingSeconds: number;
  completedFocusSessions: number;
  currentSessionInCycle: number;
  justCompletedFocus: boolean;
}

export interface PomodoroPreset {
  id: string;
  label: string;
  description: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

export interface PomodoroDailyStats {
  date: string;
  completedPomodorosToday: number;
  focusMinutesToday: number;
}

export interface PomodoroValidationResult {
  isValid: boolean;
  error?: string;
}

export const STORAGE_KEY = "chapmee-pomodoro-timer";

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 180;
export const MIN_SESSIONS = 1;
export const MAX_SESSIONS = 20;

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoSwitchMode: true,
  autoStartNextSession: false,
  soundEnabled: true,
  browserNotificationEnabled: false
};

export const POMODORO_PRESETS: PomodoroPreset[] = [
  {
    id: "classic",
    label: "Pomodoro cổ điển",
    description: "25 phút tập trung · 5 phút nghỉ ngắn · 15 phút nghỉ dài",
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4
  },
  {
    id: "deep",
    label: "Tập trung sâu",
    description: "50 phút tập trung · 10 phút nghỉ ngắn · 30 phút nghỉ dài",
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 30,
    sessionsBeforeLongBreak: 4
  },
  {
    id: "quick-study",
    label: "Học nhanh",
    description: "15 phút tập trung · 5 phút nghỉ ngắn · 15 phút nghỉ dài",
    focusMinutes: 15,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4
  },
  {
    id: "light-work",
    label: "Làm việc nhẹ",
    description: "30 phút tập trung · 5 phút nghỉ ngắn · 20 phút nghỉ dài",
    focusMinutes: 30,
    shortBreakMinutes: 5,
    longBreakMinutes: 20,
    sessionsBeforeLongBreak: 4
  }
];

export function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getModeDurationSeconds(mode: PomodoroMode, settings: PomodoroSettings): number {
  switch (mode) {
    case "focus":
      return minutesToSeconds(settings.focusMinutes);
    case "short_break":
      return minutesToSeconds(settings.shortBreakMinutes);
    case "long_break":
      return minutesToSeconds(settings.longBreakMinutes);
  }
}

export function getBreakModeAfterFocus(currentSessionInCycle: number, settings: PomodoroSettings): PomodoroMode {
  if (currentSessionInCycle >= settings.sessionsBeforeLongBreak) {
    return "long_break";
  }
  return "short_break";
}

export function getNextMode(
  currentMode: PomodoroMode,
  currentSessionInCycle: number,
  settings: PomodoroSettings
): PomodoroMode {
  if (currentMode === "focus") {
    return getBreakModeAfterFocus(currentSessionInCycle, settings);
  }
  return "focus";
}

export function getNextSessionInCycleAfterBreak(
  previousMode: PomodoroMode,
  currentSessionInCycle: number
): number {
  if (previousMode === "long_break") {
    return 1;
  }
  return currentSessionInCycle + 1;
}

export function validatePomodoroSettings(settings: PomodoroSettings): PomodoroValidationResult {
  const minuteFields: { value: number; label: string }[] = [
    { value: settings.focusMinutes, label: "Thời gian tập trung" },
    { value: settings.shortBreakMinutes, label: "Thời gian nghỉ ngắn" },
    { value: settings.longBreakMinutes, label: "Thời gian nghỉ dài" }
  ];

  for (const field of minuteFields) {
    if (!Number.isFinite(field.value) || field.value < MIN_MINUTES || field.value > MAX_MINUTES) {
      return {
        isValid: false,
        error: `${field.label} phải từ ${MIN_MINUTES} đến ${MAX_MINUTES} phút.`
      };
    }
  }

  if (
    !Number.isFinite(settings.sessionsBeforeLongBreak) ||
    settings.sessionsBeforeLongBreak < MIN_SESSIONS ||
    settings.sessionsBeforeLongBreak > MAX_SESSIONS
  ) {
    return {
      isValid: false,
      error: `Số phiên trước nghỉ dài phải từ ${MIN_SESSIONS} đến ${MAX_SESSIONS}.`
    };
  }

  return { isValid: true };
}

export function getModeLabel(mode: PomodoroMode): string {
  switch (mode) {
    case "focus":
      return "Tập trung";
    case "short_break":
      return "Nghỉ ngắn";
    case "long_break":
      return "Nghỉ dài";
  }
}

export function getStatusText(state: PomodoroState): string {
  if (state.justCompletedFocus) {
    return "Hoàn thành phiên tập trung!";
  }

  if (state.isPaused) {
    return "Đã tạm dừng.";
  }

  if (state.isRunning) {
    switch (state.mode) {
      case "focus":
        return "Đang tập trung — cố gắng không bị xao nhãng.";
      case "short_break":
        return "Đang nghỉ ngắn — thư giãn một chút.";
      case "long_break":
        return "Đang nghỉ dài — nạp lại năng lượng.";
    }
  }

  switch (state.mode) {
    case "focus":
      return "Sẵn sàng bắt đầu phiên tập trung.";
    case "short_break":
      return "Sẵn sàng bắt đầu nghỉ ngắn.";
    case "long_break":
      return "Sẵn sàng bắt đầu nghỉ dài.";
  }
}

export function getSessionDisplayText(state: PomodoroState, settings: PomodoroSettings): string {
  return `Phiên Pomodoro: ${state.currentSessionInCycle}/${settings.sessionsBeforeLongBreak}`;
}

export function getProgressPercent(remainingSeconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  const elapsed = totalSeconds - remainingSeconds;
  return Math.min(100, Math.max(0, Math.round((elapsed / totalSeconds) * 100)));
}

export function getTabTitle(mode: PomodoroMode, remainingSeconds: number): string {
  const time = formatTime(remainingSeconds);
  switch (mode) {
    case "focus":
      return `${time} - Đang tập trung`;
    case "short_break":
      return `${time} - Nghỉ ngắn`;
    case "long_break":
      return `${time} - Nghỉ dài`;
  }
}

export function getNotificationContent(mode: PomodoroMode): { title: string; body: string } {
  switch (mode) {
    case "focus":
      return {
        title: "Hết giờ tập trung!",
        body: "Đã đến lúc nghỉ ngắn."
      };
    case "short_break":
      return {
        title: "Hết giờ nghỉ!",
        body: "Quay lại phiên tập trung."
      };
    case "long_break":
      return {
        title: "Hết giờ nghỉ dài!",
        body: "Bắt đầu chu kỳ Pomodoro mới."
      };
  }
}

export function createInitialState(settings: PomodoroSettings): PomodoroState {
  return {
    mode: "focus",
    isRunning: false,
    isPaused: false,
    remainingSeconds: getModeDurationSeconds("focus", settings),
    completedFocusSessions: 0,
    currentSessionInCycle: 1,
    justCompletedFocus: false
  };
}

export function getTodayDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function createDefaultDailyStats(now = new Date()): PomodoroDailyStats {
  return {
    date: getTodayDateString(now),
    completedPomodorosToday: 0,
    focusMinutesToday: 0
  };
}

export function normalizeDailyStats(stats: PomodoroDailyStats | null | undefined, now = new Date()): PomodoroDailyStats {
  const today = getTodayDateString(now);
  if (!stats || stats.date !== today) {
    return createDefaultDailyStats(now);
  }
  return {
    date: today,
    completedPomodorosToday: Math.max(0, stats.completedPomodorosToday ?? 0),
    focusMinutesToday: Math.max(0, stats.focusMinutesToday ?? 0)
  };
}

export interface StoredPomodoroData {
  settings: PomodoroSettings;
  lastPresetId?: string;
  dailyStats?: PomodoroDailyStats;
}

export function parseStoredPomodoroData(raw: string | null): StoredPomodoroData | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPomodoroData>;
    if (!parsed.settings) return null;

    const settings: PomodoroSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed.settings
    };

    const validation = validatePomodoroSettings(settings);
    if (!validation.isValid) return null;

    return {
      settings,
      lastPresetId: typeof parsed.lastPresetId === "string" ? parsed.lastPresetId : undefined,
      dailyStats: parsed.dailyStats ? normalizeDailyStats(parsed.dailyStats) : undefined
    };
  } catch {
    return null;
  }
}

export function settingsFromPreset(preset: PomodoroPreset, current: PomodoroSettings): PomodoroSettings {
  return {
    ...current,
    focusMinutes: preset.focusMinutes,
    shortBreakMinutes: preset.shortBreakMinutes,
    longBreakMinutes: preset.longBreakMinutes,
    sessionsBeforeLongBreak: preset.sessionsBeforeLongBreak
  };
}

export function parseMinutesInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}
