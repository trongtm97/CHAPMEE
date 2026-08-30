export interface TextCaseStats {
  characters: number;
  words: number;
  lines: number;
}

export interface TextCaseResults {
  capitalizeFirst: string;
  lower: string;
  upper: string;
  titleCase: string;
  sentenceCase: string;
  inverseCase: string;
}

const SENTENCE_END_REGEX = /[.?!…]/;
const LETTER_REGEX = /\p{L}/u;

/** Unify Windows / classic Mac line endings to LF. */
function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function toLowerCaseText(input: string): string {
  return input.toLowerCase();
}

export function toUpperCaseText(input: string): string {
  return input.toUpperCase();
}

/** Capitalize the first letter of each whitespace-delimited word. */
function capitalizeWord(word: string): string {
  const match = word.match(/\p{L}/u);
  if (!match || match.index === undefined) return word;

  const idx = match.index;
  return (
    word.slice(0, idx) +
    word[idx].toUpperCase() +
    word.slice(idx + 1)
  );
}

export function capitalizeFirstLetter(input: string): string {
  const lower = input.toLowerCase();
  const match = lower.match(/\p{L}/u);
  if (!match || match.index === undefined) return lower;

  const idx = match.index;
  return lower.slice(0, idx) + lower[idx].toUpperCase() + lower.slice(idx + 1);
}

export function capitalizeEachWord(input: string): string {
  const lower = input.toLowerCase();
  return lower.replace(/\S+/g, capitalizeWord);
}

export function capitalizeSentences(input: string): string {
  const lower = input.toLowerCase();
  let result = "";
  let capitalizeNext = true;

  for (const char of lower) {
    if (capitalizeNext && LETTER_REGEX.test(char)) {
      result += char.toUpperCase();
      capitalizeNext = false;
    } else {
      result += char;
      if (SENTENCE_END_REGEX.test(char)) {
        capitalizeNext = true;
      }
    }
  }

  return result;
}

export function invertCase(input: string): string {
  return [...input]
    .map((char) => {
      const lower = char.toLowerCase();
      const upper = char.toUpperCase();

      if (char === lower && char !== upper) {
        return upper;
      }

      if (char === upper && char !== lower) {
        return lower;
      }

      return char;
    })
    .join("");
}

export function getTextStats(input: string): TextCaseStats {
  if (!input) {
    return { characters: 0, words: 0, lines: 0 };
  }

  const lines = normalizeLineEndings(input).split("\n");
  const words = input.trim() ? input.trim().split(/\s+/).filter(Boolean).length : 0;

  return {
    characters: input.length,
    words,
    lines: lines.length
  };
}

export function generateCaseResults(input: string): TextCaseResults {
  return {
    capitalizeFirst: capitalizeFirstLetter(input),
    lower: toLowerCaseText(input),
    upper: toUpperCaseText(input),
    titleCase: capitalizeEachWord(input),
    sentenceCase: capitalizeSentences(input),
    inverseCase: invertCase(input)
  };
}
