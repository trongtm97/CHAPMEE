const WORDS_PER_MINUTE = 250;

export function countEditorWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function countEditorCharacters(value: string) {
  return value.length;
}

export function estimateReadTimeMinutes(wordCount: number) {
  if (wordCount <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export function formatEditorWordCount(wordCount: number) {
  return new Intl.NumberFormat("vi-VN").format(wordCount);
}

export function formatReadTimeLabel(minutes: number) {
  if (minutes <= 0) {
    return "Chưa đủ để ước tính";
  }

  return `${minutes} phút đọc`;
}

export function getEditorStats(content: string) {
  const wordCount = countEditorWords(content);
  const characterCount = countEditorCharacters(content);
  const readTimeMinutes = estimateReadTimeMinutes(wordCount);

  return {
    characterCount,
    readTimeMinutes,
    wordCount
  };
}
