/** Map Vietnamese characters that NFD does not decompose (e.g. đ). */
const VIETNAMESE_CHAR_MAP: Record<string, string> = {
  đ: "d",
  Đ: "D"
};

/** Characters removed when "Xóa ký tự đặc biệt" is enabled. */
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()+=[\]{};:"'<>?/\\|]/g;

export type CaseMode = "preserve" | "lowercase" | "uppercase" | "titlecase";

export type ProcessOptions = {
  caseMode?: CaseMode;
  slug?: boolean;
  removeSpecialChars?: boolean;
  normalizeSpaces?: boolean;
  /** Replace runs of spaces/tabs with this delimiter (preserves line breaks). */
  replaceSpaces?: boolean;
  spaceDelimiter?: string;
};

export type TextStats = {
  characters: number;
  words: number;
  lines: number;
};

/**
 * Remove Vietnamese diacritics while preserving letter case.
 * "Nguyễn Văn Đạt" => "Nguyen Van Dat"
 */
export function removeVietnameseTones(input: string): string {
  let value = input;

  for (const [from, to] of Object.entries(VIETNAMESE_CHAR_MAP)) {
    value = value.replaceAll(from, to);
  }

  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Collapse consecutive spaces/tabs within a single line; trim trailing spaces.
 */
export function normalizeSpaces(input: string): string {
  return input.replace(/[ \t]+/g, " ").trimEnd();
}

/** Unify Windows / classic Mac line endings to LF. */
export function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Replace runs of spaces/tabs with a custom delimiter (single line). */
export function replaceSpacesWithDelimiter(input: string, delimiter: string): string {
  if (!delimiter) return input;
  return input.replace(/[ \t]+/g, delimiter);
}

/** Remove configured special characters. */
export function removeSpecialCharacters(input: string): string {
  return input.replace(SPECIAL_CHAR_REGEX, "");
}

/** Capitalize the first letter of each whitespace-delimited word. */
export function toTitleCase(input: string): string {
  return input.replace(/\S+/g, (word) => {
    const [first, ...rest] = word;
    if (!first) return word;
    return first.toUpperCase() + rest.join("");
  });
}

/**
 * Build an SEO-friendly slug: no tones, lowercase, hyphens, no special chars.
 * "Áo thun nam mùa hè 2026" => "ao-thun-nam-mua-he-2026"
 */
export function toSlug(input: string): string {
  let value = removeVietnameseTones(input).toLowerCase();
  value = removeSpecialCharacters(value);
  return value
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function applyCaseMode(input: string, caseMode: CaseMode): string {
  switch (caseMode) {
    case "lowercase":
      return input.toLowerCase();
    case "uppercase":
      return input.toUpperCase();
    case "titlecase":
      return toTitleCase(input.toLowerCase());
    default:
      return input;
  }
}

function processLine(line: string, options: ProcessOptions): string {
  const {
    caseMode = "preserve",
    removeSpecialChars = false,
    normalizeSpaces: shouldNormalizeSpaces = false,
    replaceSpaces = false,
    spaceDelimiter = "-"
  } = options;

  let value = removeVietnameseTones(line);
  value = applyCaseMode(value, caseMode);

  if (removeSpecialChars) {
    value = removeSpecialCharacters(value);
  }

  if (shouldNormalizeSpaces) {
    value = normalizeSpaces(value);
  }

  if (replaceSpaces) {
    value = replaceSpacesWithDelimiter(value, spaceDelimiter);
  }

  return value;
}

/** Full text pipeline driven by user options. Preserves line breaks in all modes. */
export function processText(input: string, options: ProcessOptions = {}): string {
  const { slug = false } = options;

  if (!input) return "";

  const normalized = normalizeLineEndings(input);

  if (slug) {
    return normalized
      .split("\n")
      .map((line) => (line.trim() ? toSlug(line) : ""))
      .join("\n");
  }

  return normalized
    .split("\n")
    .map((line) => processLine(line, options))
    .join("\n");
}

/** Character, word, and line counts for the original input text. */
export function getTextStats(input: string): TextStats {
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
