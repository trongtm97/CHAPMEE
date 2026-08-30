"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UtilityModeSelector } from "@/components/utilities/UtilityModeSelector";
import {
  utilityActionPrimaryClassName,
  utilityActionSecondaryClassName
} from "@/components/utilities/UtilityActionBar";
import {
  createDefaultDailyStats,
  createInitialState,
  DEFAULT_SETTINGS,
  formatTime,
  getBreakModeAfterFocus,
  getModeDurationSeconds,
  getModeLabel,
  getNextSessionInCycleAfterBreak,
  getNotificationContent,
  getProgressPercent,
  getSessionDisplayText,
  getStatusText,
  getTabTitle,
  normalizeDailyStats,
  parseMinutesInput,
  parseStoredPomodoroData,
  POMODORO_PRESETS,
  settingsFromPreset,
  STORAGE_KEY,
  validatePomodoroSettings,
  type PomodoroDailyStats,
  type PomodoroMode,
  type PomodoroSettings,
  type PomodoroState
} from "@/lib/utilities/pomodoro-timer";

const MODES: PomodoroMode[] = ["focus", "short_break", "long_break"];

const MODE_OPTIONS = MODES.map((mode) => ({
  value: mode,
  label: getModeLabel(mode)
}));

function readStoredData() {
  if (typeof window === "undefined") return null;
  try {
    return parseStoredPomodoroData(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredData(settings: PomodoroSettings, lastPresetId: string | undefined, dailyStats: PomodoroDailyStats) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ settings, lastPresetId, dailyStats })
    );
  } catch {
    // ignore quota / private mode
  }
}

function playBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.25);

    window.setTimeout(() => {
      void ctx.close();
    }, 500);
  } catch {
    // autoplay blocked or unsupported
  }
}

function showBrowserNotification(mode: PomodoroMode) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const content = getNotificationContent(mode);
  try {
    new Notification(content.title, { body: content.body });
  } catch {
    // ignore
  }
}

export function PomodoroTimer() {
  const storedRef = useRef(readStoredData());
  const [settings, setSettings] = useState<PomodoroSettings>(
    () => storedRef.current?.settings ?? DEFAULT_SETTINGS
  );
  const [state, setState] = useState<PomodoroState>(() => createInitialState(settings));
  const [dailyStats, setDailyStats] = useState<PomodoroDailyStats>(
    () => storedRef.current?.dailyStats ?? createDefaultDailyStats()
  );
  const [lastPresetId, setLastPresetId] = useState<string | undefined>(
    () => storedRef.current?.lastPresetId
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [draftFocus, setDraftFocus] = useState(String(settings.focusMinutes));
  const [draftShortBreak, setDraftShortBreak] = useState(String(settings.shortBreakMinutes));
  const [draftLongBreak, setDraftLongBreak] = useState(String(settings.longBreakMinutes));
  const [draftSessions, setDraftSessions] = useState(String(settings.sessionsBeforeLongBreak));

  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>("");
  const settingsRef = useRef(settings);
  const stateRef = useRef(state);
  const dailyStatsRef = useRef(dailyStats);
  const hasUserInteractedRef = useRef(false);

  settingsRef.current = settings;
  stateRef.current = state;
  dailyStatsRef.current = dailyStats;

  const reportStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 4000);
  }, []);

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const restoreDocumentTitle = useCallback(() => {
    if (typeof document !== "undefined" && originalTitleRef.current) {
      document.title = originalTitleRef.current;
    }
  }, []);

  const updateDocumentTitle = useCallback((mode: PomodoroMode, remainingSeconds: number, isRunning: boolean) => {
    if (typeof document === "undefined") return;
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }
    if (isRunning) {
      document.title = getTabTitle(mode, remainingSeconds);
    } else {
      document.title = originalTitleRef.current;
    }
  }, []);

  const persistData = useCallback(
    (nextSettings: PomodoroSettings, nextPresetId: string | undefined, nextDailyStats: PomodoroDailyStats) => {
      writeStoredData(nextSettings, nextPresetId, nextDailyStats);
    },
    []
  );

  const applySessionEndEffects = useCallback(
    (endedMode: PomodoroMode, countAsCompleted: boolean) => {
      const currentSettings = settingsRef.current;
      const currentState = stateRef.current;
      let nextDailyStats = normalizeDailyStats(dailyStatsRef.current);

      if (endedMode === "focus" && countAsCompleted) {
        nextDailyStats = {
          ...nextDailyStats,
          completedPomodorosToday: nextDailyStats.completedPomodorosToday + 1,
          focusMinutesToday: nextDailyStats.focusMinutesToday + currentSettings.focusMinutes
        };
        setDailyStats(nextDailyStats);
        persistData(currentSettings, lastPresetId, nextDailyStats);
      }

      if (currentSettings.soundEnabled && hasUserInteractedRef.current) {
        playBeep();
      }

      if (currentSettings.browserNotificationEnabled) {
        showBrowserNotification(endedMode);
      }

      if (endedMode === "focus") {
        reportStatus("Hoàn thành phiên tập trung!");
      }
    },
    [lastPresetId, persistData, reportStatus]
  );

  const transitionToMode = useCallback(
    (
      nextMode: PomodoroMode,
      options: {
        isRunning: boolean;
        currentSessionInCycle: number;
        justCompletedFocus?: boolean;
        completedFocusSessions?: number;
      }
    ) => {
      const currentSettings = settingsRef.current;
      const duration = getModeDurationSeconds(nextMode, currentSettings);

      setState((prev) => ({
        ...prev,
        mode: nextMode,
        isRunning: options.isRunning,
        isPaused: false,
        remainingSeconds: duration,
        currentSessionInCycle: options.currentSessionInCycle,
        justCompletedFocus: options.justCompletedFocus ?? false,
        completedFocusSessions: options.completedFocusSessions ?? prev.completedFocusSessions
      }));

      endTimeRef.current = options.isRunning ? Date.now() + duration * 1000 : null;
      clearTimerInterval();

      if (options.isRunning) {
        intervalRef.current = window.setInterval(() => {
          if (endTimeRef.current === null) return;
          const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
          setState((prev) => {
            updateDocumentTitle(prev.mode, remaining, true);
            return { ...prev, remainingSeconds: remaining };
          });
          if (remaining <= 0) {
            clearTimerInterval();
          }
        }, 250);
      } else {
        restoreDocumentTitle();
      }
    },
    [clearTimerInterval, restoreDocumentTitle, updateDocumentTitle]
  );

  const handleTimerComplete = useCallback(() => {
    const currentSettings = settingsRef.current;
    const currentState = stateRef.current;

    applySessionEndEffects(currentState.mode, currentState.mode === "focus");

    if (currentState.mode === "focus") {
      const nextCompleted = currentState.completedFocusSessions + 1;
      const nextBreakMode = getBreakModeAfterFocus(currentState.currentSessionInCycle, currentSettings);

      if (currentSettings.autoSwitchMode) {
        transitionToMode(nextBreakMode, {
          isRunning: currentSettings.autoStartNextSession,
          currentSessionInCycle: currentState.currentSessionInCycle,
          justCompletedFocus: !currentSettings.autoSwitchMode,
          completedFocusSessions: nextCompleted
        });
      } else {
        setState((prev) => ({
          ...prev,
          isRunning: false,
          isPaused: false,
          justCompletedFocus: true,
          completedFocusSessions: nextCompleted
        }));
        endTimeRef.current = null;
        clearTimerInterval();
        restoreDocumentTitle();
      }
      return;
    }

    const nextSession = getNextSessionInCycleAfterBreak(currentState.mode, currentState.currentSessionInCycle);

    if (currentSettings.autoSwitchMode) {
      transitionToMode("focus", {
        isRunning: currentSettings.autoStartNextSession,
        currentSessionInCycle: nextSession,
        justCompletedFocus: false
      });
    } else {
      setState((prev) => ({
        ...prev,
        mode: "focus",
        isRunning: false,
        isPaused: false,
        remainingSeconds: getModeDurationSeconds("focus", currentSettings),
        currentSessionInCycle: nextSession,
        justCompletedFocus: false
      }));
      endTimeRef.current = null;
      clearTimerInterval();
      restoreDocumentTitle();
    }
  }, [
    applySessionEndEffects,
    clearTimerInterval,
    restoreDocumentTitle,
    transitionToMode
  ]);

  useEffect(() => {
    if (state.isRunning && state.remainingSeconds <= 0) {
      handleTimerComplete();
    }
  }, [state.isRunning, state.remainingSeconds, handleTimerComplete]);

  useEffect(() => {
    return () => {
      clearTimerInterval();
      restoreDocumentTitle();
    };
  }, [clearTimerInterval, restoreDocumentTitle]);

  useEffect(() => {
    if (state.isRunning) {
      updateDocumentTitle(state.mode, state.remainingSeconds, true);
    }
  }, [state.mode, state.remainingSeconds, state.isRunning, updateDocumentTitle]);

  const handleStart = () => {
    hasUserInteractedRef.current = true;
    const duration = state.remainingSeconds > 0 ? state.remainingSeconds : getModeDurationSeconds(state.mode, settings);
    endTimeRef.current = Date.now() + duration * 1000;

    setState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      justCompletedFocus: false,
      remainingSeconds: duration
    }));

    clearTimerInterval();
    intervalRef.current = window.setInterval(() => {
      if (endTimeRef.current === null) return;
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setState((prev) => {
        updateDocumentTitle(prev.mode, remaining, true);
        return { ...prev, remainingSeconds: remaining };
      });
      if (remaining <= 0) {
        clearTimerInterval();
      }
    }, 250);
  };

  const handlePause = () => {
    if (endTimeRef.current !== null) {
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setState((prev) => ({
        ...prev,
        isRunning: false,
        isPaused: true,
        remainingSeconds: remaining
      }));
    } else {
      setState((prev) => ({ ...prev, isRunning: false, isPaused: true }));
    }
    endTimeRef.current = null;
    clearTimerInterval();
    restoreDocumentTitle();
  };

  const handleResume = () => {
    hasUserInteractedRef.current = true;
    endTimeRef.current = Date.now() + state.remainingSeconds * 1000;
    setState((prev) => ({ ...prev, isRunning: true, isPaused: false, justCompletedFocus: false }));

    clearTimerInterval();
    intervalRef.current = window.setInterval(() => {
      if (endTimeRef.current === null) return;
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setState((prev) => {
        updateDocumentTitle(prev.mode, remaining, true);
        return { ...prev, remainingSeconds: remaining };
      });
      if (remaining <= 0) {
        clearTimerInterval();
      }
    }, 250);
  };

  const handleReset = () => {
    endTimeRef.current = null;
    clearTimerInterval();
    restoreDocumentTitle();
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      justCompletedFocus: false,
      remainingSeconds: getModeDurationSeconds(prev.mode, settings)
    }));
  };

  const handleSkip = () => {
    hasUserInteractedRef.current = true;
    clearTimerInterval();
    endTimeRef.current = null;
    restoreDocumentTitle();

    if (state.mode === "focus") {
      const nextBreakMode = getBreakModeAfterFocus(state.currentSessionInCycle, settings);
      transitionToMode(nextBreakMode, {
        isRunning: settings.autoStartNextSession,
        currentSessionInCycle: state.currentSessionInCycle,
        justCompletedFocus: false
      });
      return;
    }

    const nextSession = getNextSessionInCycleAfterBreak(state.mode, state.currentSessionInCycle);
    transitionToMode("focus", {
      isRunning: settings.autoStartNextSession,
      currentSessionInCycle: nextSession,
      justCompletedFocus: false
    });
  };

  const handleModeSelect = (mode: PomodoroMode) => {
    if (state.isRunning) return;
    endTimeRef.current = null;
    clearTimerInterval();
    restoreDocumentTitle();
    setState((prev) => ({
      ...prev,
      mode,
      isPaused: false,
      justCompletedFocus: false,
      remainingSeconds: getModeDurationSeconds(mode, settings)
    }));
  };

  const handleToggleSetting = (key: keyof PomodoroSettings, value: boolean) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    persistData(nextSettings, lastPresetId, dailyStats);

    if (key === "browserNotificationEnabled" && value && typeof window !== "undefined" && "Notification" in window) {
      void Notification.requestPermission().then((permission) => {
        if (permission !== "granted") {
          reportStatus("Trình duyệt chưa cấp quyền thông báo.");
        }
      });
    }
  };

  const handleSaveSettings = () => {
    const focusMinutes = parseMinutesInput(draftFocus);
    const shortBreakMinutes = parseMinutesInput(draftShortBreak);
    const longBreakMinutes = parseMinutesInput(draftLongBreak);
    const sessionsBeforeLongBreak = parseMinutesInput(draftSessions);

    if (
      focusMinutes === null ||
      shortBreakMinutes === null ||
      longBreakMinutes === null ||
      sessionsBeforeLongBreak === null
    ) {
      setSettingsError("Vui lòng nhập thời gian hợp lệ.");
      return;
    }

    const candidate: PomodoroSettings = {
      ...settings,
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      sessionsBeforeLongBreak
    };

    const validation = validatePomodoroSettings(candidate);
    if (!validation.isValid) {
      setSettingsError(validation.error ?? "Vui lòng nhập thời gian hợp lệ.");
      return;
    }

    setSettingsError(null);
    setSettingsSaved(true);
    window.setTimeout(() => setSettingsSaved(false), 2500);

    setSettings(candidate);
    persistData(candidate, lastPresetId, dailyStats);

    if (!state.isRunning) {
      setState((prev) => ({
        ...prev,
        remainingSeconds: getModeDurationSeconds(prev.mode, candidate),
        currentSessionInCycle: Math.min(prev.currentSessionInCycle, candidate.sessionsBeforeLongBreak)
      }));
    }

    reportStatus("Đã lưu cài đặt.");
  };

  const handleRestoreDefaults = () => {
    const nextSettings: PomodoroSettings = {
      ...DEFAULT_SETTINGS,
      autoSwitchMode: settings.autoSwitchMode,
      autoStartNextSession: settings.autoStartNextSession,
      soundEnabled: settings.soundEnabled,
      browserNotificationEnabled: settings.browserNotificationEnabled
    };

    setDraftFocus(String(nextSettings.focusMinutes));
    setDraftShortBreak(String(nextSettings.shortBreakMinutes));
    setDraftLongBreak(String(nextSettings.longBreakMinutes));
    setDraftSessions(String(nextSettings.sessionsBeforeLongBreak));
    setSettingsError(null);
    setSettings(nextSettings);
    persistData(nextSettings, undefined, dailyStats);
    setLastPresetId(undefined);

    endTimeRef.current = null;
    clearTimerInterval();
    restoreDocumentTitle();
    setState(createInitialState(nextSettings));
    reportStatus("Đã khôi phục cài đặt mặc định.");
  };

  const handlePresetClick = (presetId: string) => {
    const preset = POMODORO_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    hasUserInteractedRef.current = true;
    const nextSettings = settingsFromPreset(preset, settings);

    setDraftFocus(String(nextSettings.focusMinutes));
    setDraftShortBreak(String(nextSettings.shortBreakMinutes));
    setDraftLongBreak(String(nextSettings.longBreakMinutes));
    setDraftSessions(String(nextSettings.sessionsBeforeLongBreak));
    setSettings(nextSettings);
    setLastPresetId(preset.id);
    persistData(nextSettings, preset.id, dailyStats);
    setSettingsError(null);

    endTimeRef.current = null;
    clearTimerInterval();
    restoreDocumentTitle();
    setState(createInitialState(nextSettings));
    reportStatus(`Đã áp dụng preset "${preset.label}".`);
  };

  const totalSeconds = getModeDurationSeconds(state.mode, settings);
  const progress = getProgressPercent(state.remainingSeconds, totalSeconds);
  const circumference = 2 * Math.PI * 88;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Pomodoro Timer</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Công cụ hẹn giờ Pomodoro giúp bạn tập trung làm việc, nghỉ ngắn đúng lúc và duy trì nhịp làm việc hiệu quả
          hơn.
        </p>
      </header>

      <div className="mx-auto max-w-xl space-y-6">
        <UtilityModeSelector
          ariaLabel="Chọn chế độ Pomodoro"
          disabled={state.isRunning}
          onChange={handleModeSelect}
          options={MODE_OPTIONS}
          value={state.mode}
        />

        {/* Timer display */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex h-52 w-52 items-center justify-center sm:h-56 sm:w-56">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgb(39 39 42)" strokeWidth="8" />
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="rgb(34 211 238)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <div className="text-center">
              <p className="font-mono text-5xl font-bold tabular-nums tracking-tight text-zinc-50 sm:text-6xl">
                {formatTime(state.remainingSeconds)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{progress}%</p>
            </div>
          </div>

          <div className="w-full space-y-1 text-center">
            <p className="text-sm text-zinc-300">{getStatusText(state)}</p>
            <p className="text-xs text-zinc-500">{getSessionDisplayText(state, settings)}</p>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex flex-wrap items-stretch gap-2">
          <button
            className={utilityActionSecondaryClassName}
            onClick={handleReset}
            type="button"
          >
            Đặt lại
          </button>
          <button
            className={utilityActionSecondaryClassName}
            onClick={handleSkip}
            type="button"
          >
            Bỏ qua
          </button>
          {!state.isRunning && !state.isPaused ? (
            <button
              className={utilityActionPrimaryClassName}
              onClick={handleStart}
              type="button"
            >
              Bắt đầu
            </button>
          ) : null}
          {state.isRunning ? (
            <button
              className={`${utilityActionPrimaryClassName} border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20`}
              onClick={handlePause}
              type="button"
            >
              Tạm dừng
            </button>
          ) : null}
          {state.isPaused ? (
            <button
              className={utilityActionPrimaryClassName}
              onClick={handleResume}
              type="button"
            >
              Tiếp tục
            </button>
          ) : null}
        </div>

        {/* Quick settings */}
        <section aria-labelledby="pomodoro-quick-settings" className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <h2 className="text-sm font-semibold text-zinc-200" id="pomodoro-quick-settings">
            Cài đặt nhanh
          </h2>
          <div className="space-y-2.5">
            {(
              [
                ["autoSwitchMode", "Tự động chuyển phiên tiếp theo"],
                ["autoStartNextSession", "Tự động bắt đầu phiên tiếp theo"],
                ["soundEnabled", "Âm báo khi hết giờ"],
                ["browserNotificationEnabled", "Thông báo trình duyệt"]
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(event) => handleToggleSetting(key, event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/40"
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section aria-labelledby="pomodoro-stats" className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200" id="pomodoro-stats">
            Thống kê hôm nay
          </h2>
          <ul className="space-y-1.5 text-sm text-zinc-400">
            <li>Pomodoro đã hoàn thành hôm nay: {dailyStats.completedPomodorosToday}</li>
            <li>{getSessionDisplayText(state, settings)}</li>
            <li>Tổng thời gian tập trung: {dailyStats.focusMinutesToday} phút</li>
          </ul>
        </section>

        {/* Presets */}
        <section aria-labelledby="pomodoro-presets" className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200" id="pomodoro-presets">
            Preset nhanh
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {POMODORO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id)}
                className={`rounded-xl border p-3 text-left transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/5 ${
                  lastPresetId === preset.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/10 bg-zinc-950/40"
                }`}
              >
                <p className="text-sm font-medium text-zinc-100">{preset.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{preset.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Time settings */}
        <section aria-labelledby="pomodoro-time-settings" className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <h2 className="text-sm font-semibold text-zinc-200" id="pomodoro-time-settings">
            Tùy chỉnh thời gian
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400" htmlFor="pomodoro-focus">
                Thời gian tập trung (phút)
              </label>
              <input
                id="pomodoro-focus"
                type="number"
                min={1}
                max={180}
                value={draftFocus}
                onChange={(event) => setDraftFocus(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400" htmlFor="pomodoro-short-break">
                Thời gian nghỉ ngắn (phút)
              </label>
              <input
                id="pomodoro-short-break"
                type="number"
                min={1}
                max={180}
                value={draftShortBreak}
                onChange={(event) => setDraftShortBreak(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400" htmlFor="pomodoro-long-break">
                Thời gian nghỉ dài (phút)
              </label>
              <input
                id="pomodoro-long-break"
                type="number"
                min={1}
                max={180}
                value={draftLongBreak}
                onChange={(event) => setDraftLongBreak(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400" htmlFor="pomodoro-sessions">
                Số phiên trước khi nghỉ dài
              </label>
              <input
                id="pomodoro-sessions"
                type="number"
                min={1}
                max={20}
                value={draftSessions}
                onChange={(event) => setDraftSessions(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
          </div>

          {settingsError && (
            <p className="text-sm text-red-300" role="alert">
              {settingsError}
            </p>
          )}
          {settingsSaved && (
            <p className="text-sm text-emerald-300" role="status">
              Đã lưu cài đặt thành công.
            </p>
          )}

          <div className="flex flex-wrap items-stretch gap-2">
            <button
              className={utilityActionSecondaryClassName}
              onClick={handleRestoreDefaults}
              type="button"
            >
              Mặc định
            </button>
            <button
              className={utilityActionPrimaryClassName}
              onClick={handleSaveSettings}
              type="button"
            >
              Lưu cài đặt
            </button>
          </div>
        </section>

        {/* Usage guide */}
        <section aria-labelledby="pomodoro-guide" className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-sm leading-relaxed text-zinc-400">
          <h2 className="text-sm font-semibold text-zinc-200" id="pomodoro-guide">
            Cách dùng Pomodoro Timer
          </h2>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Chọn chế độ &ldquo;Tập trung&rdquo; để bắt đầu làm việc.</li>
            <li>Bấm &ldquo;Bắt đầu&rdquo; và tập trung cho đến khi hết giờ.</li>
            <li>Khi hết phiên tập trung, nghỉ ngắn vài phút.</li>
            <li>Sau một số phiên tập trung, hãy nghỉ dài để hồi phục năng lượng.</li>
            <li>Có thể tùy chỉnh thời gian theo thói quen làm việc của bạn.</li>
          </ol>
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
            Mẹo: Trong phiên tập trung, hãy tắt thông báo, tránh mở mạng xã hội và chỉ làm một việc chính.
          </p>
          <p className="text-xs text-zinc-500">
            Công cụ chạy hoàn toàn trên trình duyệt — không gửi dữ liệu lên server.
          </p>
        </section>
      </div>

      {statusMessage && (
        <p className="text-center text-sm text-cyan-200" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
