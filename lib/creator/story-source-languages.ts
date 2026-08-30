export type StorySourceLanguageOption = {
  value: string;
  label: string;
};

/** Ngôn ngữ gốc phổ biến trong ngành truyện — tiếng Trung tách giản/phồn thể. */
export const STORY_SOURCE_LANGUAGE_OPTIONS: StorySourceLanguageOption[] = [
  { value: "zh-CN", label: "Tiếng Trung (Giản thể)" },
  { value: "zh-TW", label: "Tiếng Trung (Phồn thể)" },
  { value: "en", label: "Tiếng Anh" },
  { value: "ja", label: "Tiếng Nhật" },
  { value: "ko", label: "Tiếng Hàn" },
  { value: "th", label: "Tiếng Thái" },
  { value: "id", label: "Tiếng Indonesia" },
  { value: "ru", label: "Tiếng Nga" },
  { value: "es", label: "Tiếng Tây Ban Nha" },
  { value: "fr", label: "Tiếng Pháp" },
  { value: "other", label: "Ngôn ngữ khác" }
];

export const STORY_SOURCE_LANGUAGE_OTHER = "other";

export function isKnownStorySourceLanguage(value: string): boolean {
  return STORY_SOURCE_LANGUAGE_OPTIONS.some(
    (option) => option.value === value && option.value !== STORY_SOURCE_LANGUAGE_OTHER
  );
}

export function resolveStorySourceLanguageLabel(value: string): string {
  const known = STORY_SOURCE_LANGUAGE_OPTIONS.find((option) => option.value === value);
  if (known && known.value !== STORY_SOURCE_LANGUAGE_OTHER) {
    return known.label;
  }
  return value.trim();
}
