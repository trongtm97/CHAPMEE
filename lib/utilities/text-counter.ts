export interface WordFrequencyItem {
  word: string;
  count: number;
}

export interface WordFrequencyOptions {
  minWordLength: number;
  ignoreCommonWords: boolean;
  maxResults: number;
}

export interface TextStats {
  characters: number;
  charactersWithoutSpaces: number;
  words: number;
  sentences: number;
  lines: number;
  paragraphs: number;
  readingTime: string;
  speakingTime: string;
  wordFrequency: WordFrequencyItem[];
}

export const DEFAULT_WORD_FREQUENCY_OPTIONS: WordFrequencyOptions = {
  minWordLength: 2,
  ignoreCommonWords: false,
  maxResults: 20
};

export const COMMON_WORDS = new Set([
  "và",
  "là",
  "của",
  "có",
  "cho",
  "trong",
  "với",
  "một",
  "những",
  "các",
  "được",
  "để",
  "khi",
  "thì",
  "mà",
  "này",
  "đó",
  "tôi",
  "bạn"
]);

const READING_WORDS_PER_MINUTE = 200;
const SPEAKING_WORDS_PER_MINUTE = 130;

const SENTENCE_ENDING_REGEX = /[.?!…]+/g;
const WHITESPACE_REGEX = /[\s\t\n\r]/g;
const PARAGRAPH_SPLIT_REGEX = /\n\s*\n+/;
const PUNCTUATION_REGEX = /[.,!?;:…"'""''()[\]{}«»—–\-_/\\@#$%^&*+=<>|~`]+/g;
const VALID_WORD_REGEX = /[\p{L}\p{N}]/u;

export const SAMPLE_TEXT =
  "Tôi đang viết một bài quảng cáo cho sản phẩm mới. Nội dung cần ngắn gọn, dễ hiểu và thu hút người đọc.";

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function tokenizeForFrequency(input: string): string[] {
  const normalized = input.toLowerCase().replace(PUNCTUATION_REGEX, " ");
  return normalized.split(/\s+/).filter((token) => token.length > 0 && VALID_WORD_REGEX.test(token));
}

export function getWordFrequency(
  input: string,
  options: WordFrequencyOptions = DEFAULT_WORD_FREQUENCY_OPTIONS
): WordFrequencyItem[] {
  if (!input.trim()) return [];

  const { minWordLength, ignoreCommonWords, maxResults } = options;
  const counts = new Map<string, number>();

  for (const token of tokenizeForFrequency(input)) {
    if (token.length < minWordLength) continue;
    if (ignoreCommonWords && COMMON_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.word.localeCompare(b.word, "vi");
    })
    .slice(0, maxResults);
}

export function formatWordFrequencyForCopy(items: WordFrequencyItem[]): string {
  return items.map((item) => `${item.word}: ${item.count} lần`).join("\n");
}

export function countCharacters(input: string): number {  return input.length;
}

export function countCharactersWithoutSpaces(input: string): number {
  return input.replace(WHITESPACE_REGEX, "").length;
}

export function countWords(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function countSentences(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  const endings = trimmed.match(SENTENCE_ENDING_REGEX);
  if (endings && endings.length > 0) {
    return endings.length;
  }

  return 1;
}

export function countLines(input: string): number {
  if (!input) return 0;
  return normalizeLineEndings(input).split("\n").length;
}

export function countParagraphs(input: string): number {
  const normalized = normalizeLineEndings(input).trim();
  if (!normalized) return 0;

  return normalized.split(PARAGRAPH_SPLIT_REGEX).filter((paragraph) => paragraph.trim()).length;
}

function formatEstimatedTime(wordCount: number, wordsPerMinute: number): string {
  if (wordCount === 0) return "0 phút";

  const minutes = wordCount / wordsPerMinute;
  if (minutes < 0.5) return "Dưới 1 phút";

  return `Khoảng ${Math.ceil(minutes)} phút`;
}

export function estimateReadingTime(wordCount: number): string {
  return formatEstimatedTime(wordCount, READING_WORDS_PER_MINUTE);
}

export function estimateSpeakingTime(wordCount: number): string {
  return formatEstimatedTime(wordCount, SPEAKING_WORDS_PER_MINUTE);
}

export function getTextStats(
  input: string,
  wordFrequencyOptions: WordFrequencyOptions = DEFAULT_WORD_FREQUENCY_OPTIONS
): TextStats {
  const words = countWords(input);

  return {
    characters: countCharacters(input),
    charactersWithoutSpaces: countCharactersWithoutSpaces(input),
    words,
    sentences: countSentences(input),
    lines: countLines(input),
    paragraphs: countParagraphs(input),
    readingTime: estimateReadingTime(words),
    speakingTime: estimateSpeakingTime(words),
    wordFrequency: getWordFrequency(input, wordFrequencyOptions)
  };
}