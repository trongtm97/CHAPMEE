/**
 * Con giáp Trung Hoa (Chinese zodiac) cho scoring engine.
 * Pure functions, deterministic.
 *
 * Lưu ý MVP: đang tính theo năm dương lịch. Trong tương lai có thể thay
 * bằng lịch âm (Tết Nguyên Đán) để chính xác hơn cho người sinh tháng 1
 * đầu năm hoặc tháng 12 cuối năm âm lịch.
 */

import { REASON_CODES } from '@/lib/love-insight/shared';

export type ChineseAnimalVi =
  | 'Tý'
  | 'Sửu'
  | 'Dần'
  | 'Mão'
  | 'Thìn'
  | 'Tỵ'
  | 'Ngọ'
  | 'Mùi'
  | 'Thân'
  | 'Dậu'
  | 'Tuất'
  | 'Hợi';

export type ChineseAnimalEn =
  | 'rat'
  | 'ox'
  | 'tiger'
  | 'rabbit'
  | 'dragon'
  | 'snake'
  | 'horse'
  | 'goat'
  | 'monkey'
  | 'rooster'
  | 'dog'
  | 'pig';

export interface ChineseAnimal {
  vi: ChineseAnimalVi;
  en: ChineseAnimalEn;
}

export type ChineseRelationshipType =
  | 'TAM_HOP'
  | 'LUC_HOP'
  | 'LUC_XUNG'
  | 'NEUTRAL';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// =============================================================================
// 12 con giáp
// =============================================================================

const ANIMALS: readonly ChineseAnimal[] = [
  { vi: 'Tý', en: 'rat' },
  { vi: 'Sửu', en: 'ox' },
  { vi: 'Dần', en: 'tiger' },
  { vi: 'Mão', en: 'rabbit' },
  { vi: 'Thìn', en: 'dragon' },
  { vi: 'Tỵ', en: 'snake' },
  { vi: 'Ngọ', en: 'horse' },
  { vi: 'Mùi', en: 'goat' },
  { vi: 'Thân', en: 'monkey' },
  { vi: 'Dậu', en: 'rooster' },
  { vi: 'Tuất', en: 'dog' },
  { vi: 'Hợi', en: 'pig' },
];

// =============================================================================
// Tam hợp (triple harmony) + Lục hợp (pair) + Lục xung (clash)
// =============================================================================

const TAM_HOP_GROUPS: readonly ChineseAnimalVi[][] = [
  ['Tý', 'Thìn', 'Thân'],
  ['Sửu', 'Tỵ', 'Dậu'],
  ['Dần', 'Ngọ', 'Tuất'],
  ['Mão', 'Mùi', 'Hợi'],
];

const LUC_HOP_PAIRS = new Set<string>([
  'Tý|Sửu', 'Sửu|Tý',
  'Dần|Hợi', 'Hợi|Dần',
  'Mão|Tuất', 'Tuất|Mão',
  'Thìn|Dậu', 'Dậu|Thìn',
  'Tỵ|Thân', 'Thân|Tỵ',
  'Ngọ|Mùi', 'Mùi|Ngọ',
]);

const LUC_XUNG_SCORES: Record<string, number> = {
  'Tý|Ngọ': 48, 'Ngọ|Tý': 48,
  'Sửu|Mùi': 50, 'Mùi|Sửu': 50,
  'Dần|Thân': 52, 'Thân|Dần': 52,
  'Mão|Dậu': 48, 'Dậu|Mão': 48,
  'Thìn|Tuất': 50, 'Tuất|Thìn': 50,
  'Tỵ|Hợi': 52, 'Hợi|Tỵ': 52,
};

const NEUTRAL_SCORE = 72;
const TAM_HOP_SCORE = 92;
const LUC_HOP_SCORE = 90;

// =============================================================================
// Internals
// =============================================================================

function parseDobParts(dob: string): { year: number; month: number; day: number } | null {
  if (typeof dob !== 'string') return null;
  const m = ISO_DATE_RE.exec(dob.trim());
  if (!m) return null;
  const y = m[1];
  const mo = m[2];
  const d = m[3];
  if (!y || !mo || !d) return null;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function pairKey(a: ChineseAnimalVi, b: ChineseAnimalVi): string {
  return `${a}|${b}`;
}

// =============================================================================
// getChineseZodiacAnimal
// =============================================================================

export function getChineseZodiacAnimal(dob: string): ChineseAnimal | null {
  const parts = parseDobParts(dob);
  if (!parts) return null;
  // Chu kỳ 12 năm, anchor 4 (Tý) cho năm 4 AD theo công thức phổ biến.
  // Ví dụ: 2024 → (2024 - 4) % 12 = 4 → Dragon (Thìn). ✓
  const raw = (parts.year - 4) % 12;
  const index = ((raw % 12) + 12) % 12;
  return ANIMALS[index] ?? null;
}

// =============================================================================
// scoreChineseZodiacMatch
// =============================================================================

export interface ChineseZodiacScore {
  score: number;
  animalA: ChineseAnimal | null;
  animalB: ChineseAnimal | null;
  relationshipType: ChineseRelationshipType;
  reasonCodes: string[];
  explanation: string;
}

export function scoreChineseZodiacMatch(dobA: string, dobB: string): ChineseZodiacScore {
  const animalA = getChineseZodiacAnimal(dobA);
  const animalB = getChineseZodiacAnimal(dobB);

  if (!animalA || !animalB) {
    return {
      score: 0,
      animalA,
      animalB,
      relationshipType: 'NEUTRAL',
      reasonCodes: ['INVALID_INPUT'],
      explanation: 'Ngày sinh không hợp lệ — không thể xác định con giáp.',
    };
  }

  // 1. Tam hợp (triple harmony) — cùng nhóm 3 con
  for (const group of TAM_HOP_GROUPS) {
    if (group.includes(animalA.vi) && group.includes(animalB.vi)) {
      return {
        score: TAM_HOP_SCORE,
        animalA,
        animalB,
        relationshipType: 'TAM_HOP',
        reasonCodes: [REASON_CODES.CHINESE_TAM_HOP],
        explanation: `${animalA.vi} và ${animalB.vi} thuộc cùng nhóm tam hợp — bộ ba ${group.join(' - ')} hỗ trợ và cộng hưởng cho nhau rất tốt.`,
      };
    }
  }

  // 2. Lục hợp (pair harmony)
  if (LUC_HOP_PAIRS.has(pairKey(animalA.vi, animalB.vi))) {
    return {
      score: LUC_HOP_SCORE,
      animalA,
      animalB,
      relationshipType: 'LUC_HOP',
      reasonCodes: [REASON_CODES.CHINESE_LUC_HOP],
      explanation: `${animalA.vi} và ${animalB.vi} lục hợp — bổ trợ nhau tự nhiên, hai bên dễ thấu hiểu.`,
    };
  }

  // 3. Lục xung (clash)
  const xungKey = pairKey(animalA.vi, animalB.vi);
  if (LUC_XUNG_SCORES[xungKey] !== undefined) {
    return {
      score: LUC_XUNG_SCORES[xungKey]!,
      animalA,
      animalB,
      relationshipType: 'LUC_XUNG',
      reasonCodes: [REASON_CODES.CHINESE_LUC_XUNG],
      explanation: `${animalA.vi} và ${animalB.vi} lục xung — năng lượng đối lập, dễ xung đột nếu không biết nhường nhau.`,
    };
  }

  // 4. Trung tính
  return {
    score: NEUTRAL_SCORE,
    animalA,
    animalB,
    relationshipType: 'NEUTRAL',
    reasonCodes: [REASON_CODES.CHINESE_NEUTRAL],
    explanation: `${animalA.vi} và ${animalB.vi} không có mối quan hệ tam hợp / lục hợp / lục xung rõ ràng — quan hệ ở mức trung tính, cần thời gian tìm tiếng nói chung.`,
  };
}
