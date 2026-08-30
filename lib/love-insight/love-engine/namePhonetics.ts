/**
 * Phân tích âm thanh học tên (phonetics) cho scoring engine.
 * Pure functions, deterministic. Tín hiệu "mềm / cứng / vang / vần".
 *
 * Quy ước:
 *  - Input đã được normalize thành UPPERCASE A-Z + space.
 *  - Tất cả xử lý theo ký tự Latin, không phụ thuộc ngôn ngữ gốc.
 */

import { REASON_CODES } from '@/lib/love-insight/shared';

// =============================================================================
// Letter groups
// =============================================================================

const SOFT_LETTERS = new Set(['L', 'M', 'N', 'H', 'Y', 'A', 'O', 'U']);
const HARD_LETTERS = new Set(['T', 'K', 'C', 'G', 'R', 'D', 'P', 'B']);
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const HARD_RATIO_THRESHOLD = 0.55;
const SOFT_RATIO_THRESHOLD = 0.55;
const VOWEL_RATIO_SIMILARITY = 0.1;
const SCORE_MIN = 40;
const SCORE_MAX = 95;

// =============================================================================
// analyzeNamePhonetics
// =============================================================================

export interface NamePhonetics {
  totalLetters: number;
  softLettersCount: number;
  hardLettersCount: number;
  vowelCount: number;
  consonantCount: number;
  softRatio: number;
  hardRatio: number;
  vowelRatio: number;
  syllableCount: number;
  firstLetter: string;
  lastLetter: string;
  endingSound: string;
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

export function analyzeNamePhonetics(normalizedName: string): NamePhonetics {
  const safeInput = typeof normalizedName === 'string' ? normalizedName : '';
  const lettersOnly = safeInput.replace(/\s+/g, '').toUpperCase();
  const words = safeInput.trim().split(/\s+/).filter(Boolean);

  let softLettersCount = 0;
  let hardLettersCount = 0;
  let vowelCount = 0;
  let consonantCount = 0;

  for (const ch of lettersOnly) {
    if (ch < 'A' || ch > 'Z') continue;
    if (SOFT_LETTERS.has(ch)) softLettersCount++;
    if (HARD_LETTERS.has(ch)) hardLettersCount++;
    if (VOWELS.has(ch)) {
      vowelCount++;
    } else {
      consonantCount++;
    }
  }

  const totalLetters = lettersOnly.length;

  return {
    totalLetters,
    softLettersCount,
    hardLettersCount,
    vowelCount,
    consonantCount,
    softRatio: safeRatio(softLettersCount, totalLetters),
    hardRatio: safeRatio(hardLettersCount, totalLetters),
    vowelRatio: safeRatio(vowelCount, totalLetters),
    syllableCount: words.length,
    firstLetter: lettersOnly.charAt(0) ?? '',
    lastLetter: lettersOnly.length > 0 ? (lettersOnly.charAt(lettersOnly.length - 1) ?? '') : '',
    endingSound:
      lettersOnly.length >= 2
        ? lettersOnly.slice(-2)
        : lettersOnly,
  };
}

// =============================================================================
// scorePhoneticMatch
// =============================================================================

export interface PhoneticScore {
  score: number;
  rawValues: {
    nameA: string;
    nameB: string;
    phoneticsA: NamePhonetics;
    phoneticsB: NamePhonetics;
    syllableDiff: number;
    sameLastLetter: boolean;
    endingSoundMatch: boolean;
    hardHeavy: { a: boolean; b: boolean };
    softHeavy: { a: boolean; b: boolean };
    vowelRatioDiff: number;
  };
  reasonCodes: string[];
  explanation: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function scorePhoneticMatch(nameA: string, nameB: string): PhoneticScore {
  const a = analyzeNamePhonetics(nameA);
  const b = analyzeNamePhonetics(nameB);

  const reasonCodes: string[] = [];
  let score = 70;

  const syllableDiff = Math.abs(a.syllableCount - b.syllableCount);
  if (syllableDiff === 0) {
    score += 10;
    reasonCodes.push(REASON_CODES.NAME_RHYTHM_MATCH);
  } else if (syllableDiff === 1) {
    score += 5;
    reasonCodes.push(REASON_CODES.NAME_RHYTHM_MATCH);
  }

  const sameLastLetter = !!a.lastLetter && a.lastLetter === b.lastLetter;
  if (sameLastLetter) {
    score += 5;
    reasonCodes.push(REASON_CODES.NAME_ENDING_MATCH);
  }

  const endingSoundMatch =
    a.endingSound.length >= 2 && b.endingSound.length >= 2 && a.endingSound === b.endingSound;
  if (endingSoundMatch) {
    score += 5;
    reasonCodes.push(REASON_CODES.NAME_ENDING_MATCH);
  }

  const aIsHard = a.hardRatio > HARD_RATIO_THRESHOLD;
  const bIsHard = b.hardRatio > HARD_RATIO_THRESHOLD;
  const aIsSoft = a.softRatio > SOFT_RATIO_THRESHOLD;
  const bIsSoft = b.softRatio > SOFT_RATIO_THRESHOLD;

  if ((aIsHard && bIsSoft) || (aIsSoft && bIsHard)) {
    score += 5;
    reasonCodes.push(REASON_CODES.NAME_SOUND_COMPLEMENT);
  }

  if (aIsHard && bIsHard) {
    score -= 8;
    reasonCodes.push(REASON_CODES.NAME_STRONG_COLLISION);
  }

  const vowelRatioDiff = Math.abs(a.vowelRatio - b.vowelRatio);
  if (vowelRatioDiff < VOWEL_RATIO_SIMILARITY) {
    score += 4;
    reasonCodes.push(REASON_CODES.NAME_SOFT_BALANCE);
  }

  const finalScore = clamp(score, SCORE_MIN, SCORE_MAX);

  return {
    score: finalScore,
    rawValues: {
      nameA,
      nameB,
      phoneticsA: a,
      phoneticsB: b,
      syllableDiff,
      sameLastLetter,
      endingSoundMatch,
      hardHeavy: { a: aIsHard, b: bIsHard },
      softHeavy: { a: aIsSoft, b: bIsSoft },
      vowelRatioDiff,
    },
    reasonCodes,
    explanation: buildExplanation(nameA, nameB, finalScore, reasonCodes),
  };
}

// =============================================================================
// Explanation builder
// =============================================================================

function buildExplanation(
  nameA: string,
  nameB: string,
  score: number,
  reasonCodes: string[],
): string {
  const parts: string[] = [];

  if (reasonCodes.includes(REASON_CODES.NAME_RHYTHM_MATCH)) {
    parts.push('Nhịp tên (số âm tiết) trùng hoặc gần trùng — dễ đọc cùng nhau.');
  }
  if (reasonCodes.includes(REASON_CODES.NAME_ENDING_MATCH)) {
    parts.push('Vần cuối tương đồng tạo cảm giác cặp đôi ăn ý khi gọi tên nhau.');
  }
  if (reasonCodes.includes(REASON_CODES.NAME_SOUND_COMPLEMENT)) {
    parts.push('Một bên thiên về âm cứng, bên kia âm mềm — bổ trợ và cân bằng.');
  }
  if (reasonCodes.includes(REASON_CODES.NAME_STRONG_COLLISION)) {
    parts.push('Cả hai tên đều nặng về âm cứng — dễ gây cãi vã nếu cả hai đều nóng tính.');
  }
  if (reasonCodes.includes(REASON_CODES.NAME_SOFT_BALANCE)) {
    parts.push('Tỉ lệ nguyên âm tương đương — nhịp nói chuyện dễ hoà hợp.');
  }

  const intro = `Tên ${nameA.trim()} và ${nameB.trim()} có dấu hiệu âm thanh học ${interpretScore(score)}.`;
  const tail = parts.length > 0 ? ' ' + parts.join(' ') : '';
  return intro + tail;
}

function interpretScore(score: number): string {
  if (score >= 85) return 'rất tốt';
  if (score >= 75) return 'khá hài hoà';
  if (score >= 60) return 'trung bình';
  return 'cần chú ý';
}
