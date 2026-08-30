import { removeVietnameseTones as removeTonesFromLib } from "@/lib/utilities/vietnamese-tone-remover";

export type MoneyToWordsOptions = {
  includeCurrency: boolean;
  includeEvenWord: boolean;
  removeTones: boolean;
};

export type MoneyToWordsResult = {
  capitalizeFirst: string;
  lower: string;
  upper: string;
};

export type MoneyToWordsErrorCode = "empty" | "invalid" | "too_large";

export type MoneyToWordsParseResult =
  | { ok: true; value: bigint }
  | { ok: false; error: MoneyToWordsErrorCode };

/** Maximum supported amount: 999.999.999.999.999 */
export const MAX_MONEY_AMOUNT = BigInt("999999999999999");

const DIGIT_WORDS = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín"
] as const;

const SCALE_NAMES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"] as const;

const CURRENCY_SUFFIX_REGEX = /đồng|vnd|đ/gi;
const THOUSAND_SEPARATOR_REGEX = /[.,\s]/g;

/**
 * Strip thousand separators, currency text, and whitespace from money input.
 */
export function cleanMoneyInput(input: string): string {
  let value = input.trim();
  value = value.replace(CURRENCY_SUFFIX_REGEX, "");
  value = value.replace(THOUSAND_SEPARATOR_REGEX, "");
  return value.trim();
}

/** Format integer digits with dot as thousand separator (Vietnamese style). */
export function formatNumber(input: string | number | bigint): string {
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return "";

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function removeVietnameseTones(input: string): string {
  return removeTonesFromLib(input);
}

export function capitalizeFirstLetter(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function readOnesDigit(digit: number, tensDigit: number): string {
  if (digit === 1 && tensDigit >= 2) return "mốt";
  if (digit === 5 && tensDigit >= 1) return "lăm";
  return DIGIT_WORDS[digit] ?? "";
}

function readTwoDigits(tens: number, ones: number): string {
  if (tens === 0) {
    return ones === 0 ? "" : DIGIT_WORDS[ones];
  }

  if (tens === 1) {
    if (ones === 0) return "mười";
    return `mười ${readOnesDigit(ones, 1)}`;
  }

  if (ones === 0) return `${DIGIT_WORDS[tens]} mươi`;
  return `${DIGIT_WORDS[tens]} mươi ${readOnesDigit(ones, tens)}`;
}

/**
 * Read a 3-digit block (0–999) using Vietnamese money-reading rules.
 */
function readThreeDigitGroup(group: number, hadPreviousNonZero: boolean): string {
  if (group === 0) return "";

  const hundreds = Math.floor(group / 100);
  const tens = Math.floor((group % 100) / 10);
  const ones = group % 10;
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${DIGIT_WORDS[hundreds]} trăm`);
  } else if (hadPreviousNonZero && (tens > 0 || ones > 0)) {
    parts.push("không trăm");
  }

  if (tens > 0) {
    parts.push(readTwoDigits(tens, ones));
  } else if (ones > 0) {
    if (hundreds > 0 || hadPreviousNonZero) {
      parts.push(`linh ${DIGIT_WORDS[ones]}`);
    } else {
      parts.push(DIGIT_WORDS[ones]);
    }
  }

  return parts.join(" ");
}

function getScaleName(scaleIndex: number): string {
  return SCALE_NAMES[scaleIndex] ?? "";
}

/**
 * Convert a non-negative integer to Vietnamese words (lowercase, without "đồng").
 */
export function numberToVietnameseWords(value: number | string | bigint): string {
  const digits = typeof value === "bigint" ? value.toString() : String(value).replace(/\D/g, "");

  if (!digits || !/^\d+$/.test(digits)) return "";
  if (digits === "0") return "không";

  const padded = digits.length % 3 === 0 ? digits : digits.padStart(Math.ceil(digits.length / 3) * 3, "0");
  const groupCount = padded.length / 3;
  const groups: number[] = [];

  for (let index = 0; index < groupCount; index += 1) {
    const chunk = padded.slice(index * 3, index * 3 + 3);
    groups.push(Number.parseInt(chunk, 10));
  }

  const parts: string[] = [];
  let hadPreviousNonZero = false;

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    if (group === 0) continue;

    const scaleIndex = groupCount - 1 - index;
    const groupWords = readThreeDigitGroup(group, hadPreviousNonZero);
    const scale = getScaleName(scaleIndex);
    const segment = scale ? `${groupWords} ${scale}` : groupWords;

    parts.push(segment.trim());
    hadPreviousNonZero = true;
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function parseMoneyAmount(input: string): MoneyToWordsParseResult {
  const cleaned = cleanMoneyInput(input);

  if (!cleaned) {
    return { ok: false, error: "empty" };
  }

  if (!/^\d+$/.test(cleaned)) {
    return { ok: false, error: "invalid" };
  }

  let value: bigint;
  try {
    value = BigInt(cleaned);
  } catch {
    return { ok: false, error: "invalid" };
  }

  if (value > MAX_MONEY_AMOUNT) {
    return { ok: false, error: "too_large" };
  }

  return { ok: true, value };
}

function buildBasePhrase(value: bigint, options: MoneyToWordsOptions): string {
  let phrase = numberToVietnameseWords(value);

  if (options.includeCurrency) {
    phrase = phrase ? `${phrase} đồng` : "đồng";
  }

  if (options.includeEvenWord) {
    phrase = phrase ? `${phrase} chẵn` : "chẵn";
  }

  if (options.removeTones) {
    phrase = removeVietnameseTones(phrase);
  }

  return phrase;
}

export function generateMoneyToWordsResults(
  input: string,
  options: MoneyToWordsOptions
): MoneyToWordsResult | { error: MoneyToWordsErrorCode } {
  const parsed = parseMoneyAmount(input);

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const base = buildBasePhrase(parsed.value, options);
  const lower = base.toLowerCase();

  return {
    capitalizeFirst: capitalizeFirstLetter(lower),
    lower,
    upper: lower.toUpperCase()
  };
}

export function getMoneyToWordsErrorMessage(error: MoneyToWordsErrorCode): string {
  switch (error) {
    case "empty":
      return "Nhập số tiền để xem kết quả bằng chữ.";
    case "invalid":
      return "Vui lòng nhập số tiền hợp lệ.";
    case "too_large":
      return "Số tiền quá lớn, vui lòng nhập số nhỏ hơn.";
    default:
      return "Vui lòng nhập số tiền hợp lệ.";
  }
}
