import { readStorageItem, STORAGE_KEYS, writeStorageItem } from "@/lib/brand/storage";

export type ReaderFontSize = "small" | "medium" | "large" | "xlarge";
export type ReaderTheme = "dark" | "light" | "paper" | "black";
export type ReaderFontFamily = "default" | "serif" | "sans";
export type ReaderLineHeight = "compact" | "normal" | "relaxed";
export type ReaderContentWidth = "narrow" | "default" | "wide";

export type ReadingPreferences = {
  fontSize: ReaderFontSize;
  theme: ReaderTheme;
  fontFamily: ReaderFontFamily;
  lineHeight: ReaderLineHeight;
  contentWidth: ReaderContentWidth;
};

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  fontSize: "medium",
  theme: "dark",
  fontFamily: "default",
  lineHeight: "normal",
  contentWidth: "default"
};

const STORAGE_KEY = STORAGE_KEYS.readingPreferences;

function isFontSize(value: unknown): value is ReaderFontSize {
  return value === "small" || value === "medium" || value === "large" || value === "xlarge";
}

function isTheme(value: unknown): value is ReaderTheme {
  return (
    value === "dark" ||
    value === "light" ||
    value === "paper" ||
    value === "black"
  );
}

function isContentWidth(value: unknown): value is ReaderContentWidth {
  return value === "narrow" || value === "default" || value === "wide";
}

function isFontFamily(value: unknown): value is ReaderFontFamily {
  return value === "default" || value === "serif" || value === "sans";
}

function isLineHeight(value: unknown): value is ReaderLineHeight {
  return value === "compact" || value === "normal" || value === "relaxed";
}

export function loadReadingPreferences(): ReadingPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_READING_PREFERENCES;
  }

  try {
    const raw = readStorageItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_READING_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<ReadingPreferences>;
    return {
      fontSize: isFontSize(parsed.fontSize)
        ? parsed.fontSize
        : DEFAULT_READING_PREFERENCES.fontSize,
      theme: isTheme(parsed.theme) ? parsed.theme : DEFAULT_READING_PREFERENCES.theme,
      fontFamily: isFontFamily(parsed.fontFamily)
        ? parsed.fontFamily
        : DEFAULT_READING_PREFERENCES.fontFamily,
      lineHeight: isLineHeight(parsed.lineHeight)
        ? parsed.lineHeight
        : DEFAULT_READING_PREFERENCES.lineHeight,
      contentWidth: isContentWidth(parsed.contentWidth)
        ? parsed.contentWidth
        : DEFAULT_READING_PREFERENCES.contentWidth
    };
  } catch {
    return DEFAULT_READING_PREFERENCES;
  }
}

export function resetReadingPreferences(): ReadingPreferences {
  saveReadingPreferences(DEFAULT_READING_PREFERENCES);
  return DEFAULT_READING_PREFERENCES;
}

export function saveReadingPreferences(preferences: ReadingPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  writeStorageItem(STORAGE_KEY, JSON.stringify(preferences));
}
