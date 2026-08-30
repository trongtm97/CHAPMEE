/**
 * Cung hoàng đạo Tây phương (Western zodiac) cho scoring engine.
 * Pure functions, deterministic.
 *
 * Quy ước: input là DOB ISO `YYYY-MM-DD`, mọi giá trị trả về là các
 * string literal type đã định nghĩa trong schema/Prisma.
 */

import { REASON_CODES } from '@/lib/love-insight/shared';

export type ZodiacElement = 'FIRE' | 'EARTH' | 'AIR' | 'WATER';
export type ZodiacModality = 'CARDINAL' | 'FIXED' | 'MUTABLE';
export type ZodiacPolarity = 'MASCULINE' | 'FEMININE';

export interface ZodiacSign {
  signVi: string;
  signEn: string;
  element: ZodiacElement;
  modality: ZodiacModality;
  polarity: ZodiacPolarity;
}

interface ZodiacDef extends ZodiacSign {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// =============================================================================
// 12 cung — sắp xếp theo tháng bắt đầu để dễ lookup
// =============================================================================

const ZODIAC_SIGNS: readonly ZodiacDef[] = [
  { signVi: 'Bảo Bình', signEn: 'Aquarius', element: 'AIR', modality: 'FIXED', polarity: 'MASCULINE', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
  { signVi: 'Song Ngư', signEn: 'Pisces', element: 'WATER', modality: 'MUTABLE', polarity: 'FEMININE', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
  { signVi: 'Bạch Dương', signEn: 'Aries', element: 'FIRE', modality: 'CARDINAL', polarity: 'MASCULINE', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
  { signVi: 'Kim Ngưu', signEn: 'Taurus', element: 'EARTH', modality: 'FIXED', polarity: 'FEMININE', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
  { signVi: 'Song Tử', signEn: 'Gemini', element: 'AIR', modality: 'MUTABLE', polarity: 'MASCULINE', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
  { signVi: 'Cự Giải', signEn: 'Cancer', element: 'WATER', modality: 'CARDINAL', polarity: 'FEMININE', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
  { signVi: 'Sư Tử', signEn: 'Leo', element: 'FIRE', modality: 'FIXED', polarity: 'MASCULINE', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
  { signVi: 'Xử Nữ', signEn: 'Virgo', element: 'EARTH', modality: 'MUTABLE', polarity: 'FEMININE', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
  { signVi: 'Thiên Bình', signEn: 'Libra', element: 'AIR', modality: 'CARDINAL', polarity: 'MASCULINE', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
  { signVi: 'Bọ Cạp', signEn: 'Scorpio', element: 'WATER', modality: 'FIXED', polarity: 'FEMININE', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
  { signVi: 'Nhân Mã', signEn: 'Sagittarius', element: 'FIRE', modality: 'MUTABLE', polarity: 'MASCULINE', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
  { signVi: 'Ma Kết', signEn: 'Capricorn', element: 'EARTH', modality: 'CARDINAL', polarity: 'FEMININE', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
];

// =============================================================================
// Element pair table (10/10 cặp — 4 same + 6 cross)
// =============================================================================

const ELEMENT_PAIR_SCORES: Record<string, number> = {
  FIRE_FIRE: 82,
  FIRE_EARTH: 68,
  FIRE_AIR: 88,
  FIRE_WATER: 58,
  EARTH_EARTH: 82,
  EARTH_AIR: 62,
  EARTH_WATER: 90,
  AIR_AIR: 82,
  AIR_WATER: 65,
  WATER_WATER: 84,
};

const MODALITY_PAIR_SCORES: Record<string, number> = {
  CARDINAL_CARDINAL: 72,
  CARDINAL_FIXED: 70,
  CARDINAL_MUTABLE: 84,
  FIXED_FIXED: 62,
  FIXED_MUTABLE: 76,
  MUTABLE_MUTABLE: 78,
};

const HIGH_ELEMENT_THRESHOLD = 82;
const LOW_ELEMENT_THRESHOLD = 70;
const HIGH_MODALITY_THRESHOLD = 76;
const LOW_MODALITY_THRESHOLD = 70;

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
  // Xác thực ngày thực sự tồn tại (vd. Feb 30 → null).
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

function isInRange(month: number, day: number, sign: ZodiacDef): boolean {
  const input = month * 100 + day;
  const start = sign.startMonth * 100 + sign.startDay;
  const end = sign.endMonth * 100 + sign.endDay;
  if (start <= end) {
    return input >= start && input <= end;
  }
  // wraps year (Capricorn: 12-22 → 1-19)
  return input >= start || input <= end;
}

function pairScore(table: Record<string, number>, a: string, b: string): number {
  return table[`${a}_${b}`] ?? table[`${b}_${a}`] ?? 0;
}

// =============================================================================
// getZodiacSign
// =============================================================================

export function getZodiacSign(dob: string): ZodiacSign | null {
  const parts = parseDobParts(dob);
  if (!parts) return null;
  for (const sign of ZODIAC_SIGNS) {
    if (isInRange(parts.month, parts.day, sign)) {
      const { startMonth: _sm, startDay: _sd, endMonth: _em, endDay: _ed, ...pub } = sign;
      return pub;
    }
  }
  return null;
}

// =============================================================================
// scoreZodiacMatch
// =============================================================================

export interface ZodiacScore {
  score: number;
  elementScore: number;
  modalityScore: number;
  rawValues: {
    signA: ZodiacSign | null;
    signB: ZodiacSign | null;
    elementA: ZodiacElement;
    elementB: ZodiacElement;
    modalityA: ZodiacModality;
    modalityB: ZodiacModality;
  };
  reasonCodes: string[];
  explanation: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function scoreZodiacMatch(dobA: string, dobB: string): ZodiacScore {
  const signA = getZodiacSign(dobA);
  const signB = getZodiacSign(dobB);

  if (!signA || !signB) {
    return {
      score: 0,
      elementScore: 0,
      modalityScore: 0,
      rawValues: {
        signA,
        signB,
        elementA: signA?.element ?? 'FIRE',
        elementB: signB?.element ?? 'FIRE',
        modalityA: signA?.modality ?? 'CARDINAL',
        modalityB: signB?.modality ?? 'CARDINAL',
      },
      reasonCodes: ['INVALID_INPUT'],
      explanation: 'Ngày sinh không hợp lệ — không thể xác định cung hoàng đạo.',
    };
  }

  const elementScore = pairScore(ELEMENT_PAIR_SCORES, signA.element, signB.element);
  const modalityScore = pairScore(MODALITY_PAIR_SCORES, signA.modality, signB.modality);
  const score = round2(elementScore * 0.65 + modalityScore * 0.35);

  const reasonCodes: string[] = [];
  if (elementScore >= HIGH_ELEMENT_THRESHOLD) {
    reasonCodes.push(REASON_CODES.ZODIAC_ELEMENT_HARMONY);
  } else if (elementScore <= LOW_ELEMENT_THRESHOLD) {
    reasonCodes.push(REASON_CODES.ZODIAC_ELEMENT_FRICTION);
  }
  if (modalityScore >= HIGH_MODALITY_THRESHOLD) {
    reasonCodes.push(REASON_CODES.ZODIAC_MODALITY_MATCH);
  } else if (modalityScore <= LOW_MODALITY_THRESHOLD) {
    reasonCodes.push(REASON_CODES.ZODIAC_MODALITY_TENSION);
  }

  return {
    score,
    elementScore,
    modalityScore,
    rawValues: {
      signA,
      signB,
      elementA: signA.element,
      elementB: signB.element,
      modalityA: signA.modality,
      modalityB: signB.modality,
    },
    reasonCodes,
    explanation: buildExplanation(signA, signB, elementScore, modalityScore, score),
  };
}

function buildExplanation(
  a: ZodiacSign,
  b: ZodiacSign,
  elementScore: number,
  modalityScore: number,
  finalScore: number,
): string {
  const sameElement = a.element === b.element;
  const sameModality = a.modality === b.modality;

  const elementPart = sameElement
    ? `Cùng nguyên tố ${a.element} — về bản chất, hai bạn cùng dòng năng lượng.`
    : `Nguyên tố ${a.element} kết hợp với ${b.element} — mức hoà hợp ${elementScore}/100.`;

  const modalityPart = sameModality
    ? `Cùng modality ${a.modality} — nhịp sống giống nhau, dễ đồng bộ.`
    : `Modality ${a.modality} kết hợp với ${b.modality} — nhịp sống hoà hợp ${modalityScore}/100.`;

  return `${a.signVi} (${a.signEn}) và ${b.signVi} (${b.signEn}): ${elementPart} ${modalityPart} Điểm tổng hợp: ${finalScore}/100.`;
}
