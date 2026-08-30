/**
 * Self-test for Pomodoro Timer utility.
 * Run: npm run test:pomodoro-timer
 */

import {
  createInitialState,
  DEFAULT_SETTINGS,
  formatTime,
  getBreakModeAfterFocus,
  getModeDurationSeconds,
  getModeLabel,
  getNextMode,
  getNextSessionInCycleAfterBreak,
  getProgressPercent,
  getSessionDisplayText,
  getStatusText,
  getTabTitle,
  minutesToSeconds,
  normalizeDailyStats,
  settingsFromPreset,
  validatePomodoroSettings,
  type PomodoroSettings,
  type PomodoroState
} from "../lib/utilities/pomodoro-timer";

let passed = 0;
let failed = 0;

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual === expected) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected: ${String(expected)}`);
  console.error(`  actual:   ${String(actual)}`);
}

function assertTrue(condition: boolean, label: string) {
  assertEqual(condition, true, label);
}

// Test 1: Timer mặc định
const initialState = createInitialState(DEFAULT_SETTINGS);
assertEqual(initialState.mode, "focus", "test 1 mode");
assertEqual(formatTime(initialState.remainingSeconds), "25:00", "test 1 time");
assertEqual(getSessionDisplayText(initialState, DEFAULT_SETTINGS), "Phiên Pomodoro: 1/4", "test 1 session");

// Test 2: formatTime
assertEqual(formatTime(0), "00:00", "formatTime zero");
assertEqual(formatTime(65), "01:05", "formatTime 65s");
assertEqual(formatTime(1500), "25:00", "formatTime 25min");

// Test 3: minutesToSeconds
assertEqual(minutesToSeconds(25), 1500, "minutesToSeconds 25");

// Test 4: getModeDurationSeconds
assertEqual(getModeDurationSeconds("focus", DEFAULT_SETTINGS), 1500, "duration focus");
assertEqual(getModeDurationSeconds("short_break", DEFAULT_SETTINGS), 300, "duration short break");
assertEqual(getModeDurationSeconds("long_break", DEFAULT_SETTINGS), 900, "duration long break");

// Test 5: getBreakModeAfterFocus
assertEqual(getBreakModeAfterFocus(1, DEFAULT_SETTINGS), "short_break", "break after session 1");
assertEqual(getBreakModeAfterFocus(3, DEFAULT_SETTINGS), "short_break", "break after session 3");
assertEqual(getBreakModeAfterFocus(4, DEFAULT_SETTINGS), "long_break", "break after session 4");

// Test 6: getNextMode
assertEqual(getNextMode("focus", 1, DEFAULT_SETTINGS), "short_break", "next mode focus session 1");
assertEqual(getNextMode("focus", 4, DEFAULT_SETTINGS), "long_break", "next mode focus session 4");
assertEqual(getNextMode("short_break", 2, DEFAULT_SETTINGS), "focus", "next mode short break");
assertEqual(getNextMode("long_break", 4, DEFAULT_SETTINGS), "focus", "next mode long break");

// Test 7: getNextSessionInCycleAfterBreak
assertEqual(getNextSessionInCycleAfterBreak("short_break", 1), 2, "session after short break");
assertEqual(getNextSessionInCycleAfterBreak("long_break", 4), 1, "session after long break");

// Test 8: getStatusText
const readyState: PomodoroState = { ...initialState, isRunning: false, isPaused: false };
assertEqual(getStatusText(readyState), "Sẵn sàng bắt đầu phiên tập trung.", "status ready");

const runningFocus: PomodoroState = { ...initialState, isRunning: true, isPaused: false };
assertEqual(
  getStatusText(runningFocus),
  "Đang tập trung — cố gắng không bị xao nhãng.",
  "status running focus"
);

const pausedState: PomodoroState = { ...initialState, isRunning: false, isPaused: true };
assertEqual(getStatusText(pausedState), "Đã tạm dừng.", "status paused");

const completedState: PomodoroState = { ...initialState, justCompletedFocus: true };
assertEqual(getStatusText(completedState), "Hoàn thành phiên tập trung!", "status completed");

// Test 9: validatePomodoroSettings
assertTrue(validatePomodoroSettings(DEFAULT_SETTINGS).isValid, "validate default settings");

const invalidZero: PomodoroSettings = { ...DEFAULT_SETTINGS, focusMinutes: 0 };
assertTrue(!validatePomodoroSettings(invalidZero).isValid, "validate zero focus");

const invalidNegative: PomodoroSettings = { ...DEFAULT_SETTINGS, shortBreakMinutes: -1 };
assertTrue(!validatePomodoroSettings(invalidNegative).isValid, "validate negative break");

const invalidMax: PomodoroSettings = { ...DEFAULT_SETTINGS, longBreakMinutes: 181 };
assertTrue(!validatePomodoroSettings(invalidMax).isValid, "validate max exceeded");

// Test 10: Preset "Tập trung sâu"
const deepPreset = settingsFromPreset(
  {
    id: "deep",
    label: "Tập trung sâu",
    description: "",
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 30,
    sessionsBeforeLongBreak: 4
  },
  DEFAULT_SETTINGS
);
assertEqual(deepPreset.focusMinutes, 50, "preset deep focus");
assertEqual(deepPreset.shortBreakMinutes, 10, "preset deep short break");
assertEqual(deepPreset.longBreakMinutes, 30, "preset deep long break");
assertEqual(formatTime(getModeDurationSeconds("focus", deepPreset)), "50:00", "preset deep timer");

// Test 11: Progress
assertEqual(getProgressPercent(1500, 1500), 0, "progress 0%");
assertEqual(getProgressPercent(750, 1500), 50, "progress 50%");
assertEqual(getProgressPercent(0, 1500), 100, "progress 100%");

// Test 12: Tab title
assertEqual(getTabTitle("focus", 1499), "24:59 - Đang tập trung", "tab title focus");
assertEqual(getTabTitle("short_break", 299), "04:59 - Nghỉ ngắn", "tab title short break");

// Test 13: getModeLabel
assertEqual(getModeLabel("focus"), "Tập trung", "label focus");
assertEqual(getModeLabel("short_break"), "Nghỉ ngắn", "label short break");
assertEqual(getModeLabel("long_break"), "Nghỉ dài", "label long break");

// Test 14: Daily stats reset on new day
const oldStats = normalizeDailyStats({
  date: "2020-01-01",
  completedPomodorosToday: 5,
  focusMinutesToday: 100
});
assertEqual(oldStats.completedPomodorosToday, 0, "daily stats reset pomodoros");
assertEqual(oldStats.focusMinutesToday, 0, "daily stats reset minutes");

// Test 15: Quick test settings (1/1/2 min)
const quickSettings: PomodoroSettings = {
  ...DEFAULT_SETTINGS,
  focusMinutes: 1,
  shortBreakMinutes: 1,
  longBreakMinutes: 2
};
assertEqual(formatTime(getModeDurationSeconds("focus", quickSettings)), "01:00", "quick settings focus");
assertEqual(getBreakModeAfterFocus(4, quickSettings), "long_break", "quick settings long break at 4");

console.log(`\nPomodoro Timer self-test: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
