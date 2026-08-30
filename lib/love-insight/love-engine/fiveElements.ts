/**
 * Ngũ hành (Five Elements) cho scoring engine.
 * Pure functions, deterministic.
 *
 * Quy ước mapping: tên tiếng Anh viết HOA theo enum trong Prisma schema
 * (WOOD / FIRE / EARTH / METAL / WATER).
 */

import { REASON_CODES } from '@/lib/love-insight/shared';

export type Element = 'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER';

export type ElementRelationType =
  | 'SAME'
  | 'GENERATING_FORWARD'
  | 'GENERATING_REVERSE'
  | 'CONTROLLING_LIGHT'
  | 'CONTROLLING_STRONG'
  | 'NEUTRAL';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// =============================================================================
// Quan hệ ngũ hành
// =============================================================================

/** Tương sinh: key sinh ra value. */
const GENERATING_FORWARD: Record<Element, Element> = {
  WOOD: 'FIRE',
  FIRE: 'EARTH',
  EARTH: 'METAL',
  METAL: 'WATER',
  WATER: 'WOOD',
};

/** Tương khắc: key khắc value. */
const CONTROLLING: Record<Element, Element> = {
  WOOD: 'EARTH',
  EARTH: 'WATER',
  WATER: 'FIRE',
  FIRE: 'METAL',
  METAL: 'WOOD',
};

const SCORES = {
  SAME: 78,
  GENERATING_FORWARD: 92,
  GENERATING_REVERSE: 86,
  CONTROLLING_LIGHT: 62,
  CONTROLLING_STRONG: 50,
  NEUTRAL: 70,
} as const;

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

function isElement(value: unknown): value is Element {
  return value === 'WOOD' || value === 'FIRE' || value === 'EARTH' || value === 'METAL' || value === 'WATER';
}

// =============================================================================
// scoreElementPair
// =============================================================================

export interface ElementScore {
  score: number;
  relationType: ElementRelationType;
  reasonCodes: string[];
  explanation: string;
}

export function scoreElementPair(a: unknown, b: unknown): ElementScore {
  if (!isElement(a) || !isElement(b)) {
    return {
      score: 0,
      relationType: 'NEUTRAL',
      reasonCodes: ['INVALID_INPUT'],
      explanation: 'Ngũ hành không hợp lệ.',
    };
  }

  if (a === b) {
    return {
      score: SCORES.SAME,
      relationType: 'SAME',
      reasonCodes: [REASON_CODES.ELEMENT_SAME],
      explanation: `Cùng ngũ hành ${a} — hai bên chia sẻ cùng dòng năng lượng, dễ đồng cảm nhưng đôi khi cũng dễ cùng mắc một lỗi.`,
    };
  }

  // Tương sinh: a sinh b → forward
  if (GENERATING_FORWARD[a] === b) {
    return {
      score: SCORES.GENERATING_FORWARD,
      relationType: 'GENERATING_FORWARD',
      reasonCodes: [REASON_CODES.ELEMENT_GENERATING],
      explanation: `${a} tương sinh với ${b} (a nuôi dưỡng b) — một bên cho, một bên nhận, dòng chảy tự nhiên.`,
    };
  }

  // Tương sinh: b sinh a → reverse (a là b được sinh ra)
  if (GENERATING_FORWARD[b] === a) {
    return {
      score: SCORES.GENERATING_REVERSE,
      relationType: 'GENERATING_REVERSE',
      reasonCodes: [REASON_CODES.ELEMENT_GENERATING],
      explanation: `${b} tương sinh với ${a} — bên ${b} hỗ trợ bên ${a} phát triển, quan hệ có đi có lại.`,
    };
  }

  // Tương khắc: a khắc b → light (a đang kiểm soát)
  if (CONTROLLING[a] === b) {
    return {
      score: SCORES.CONTROLLING_LIGHT,
      relationType: 'CONTROLLING_LIGHT',
      reasonCodes: [REASON_CODES.ELEMENT_CLASH],
      explanation: `${a} tương khắc với ${b} — bên ${a} có xu hướng áp đặt, bên ${b} cần chủ động giữ ranh giới.`,
    };
  }

  // Tương khắc: b khắc a → strong (a đang bị kiểm soát)
  if (CONTROLLING[b] === a) {
    return {
      score: SCORES.CONTROLLING_STRONG,
      relationType: 'CONTROLLING_STRONG',
      reasonCodes: [REASON_CODES.ELEMENT_CLASH],
      explanation: `${b} tương khắc với ${a} — bên ${a} dễ bị bên ${b} kìm hãm, cần ý thức để dung hoà.`,
    };
  }

  return {
    score: SCORES.NEUTRAL,
    relationType: 'NEUTRAL',
    reasonCodes: [REASON_CODES.ELEMENT_NEUTRAL],
    explanation: `${a} và ${b} không có quan hệ tương sinh / tương khắc trực tiếp — quan hệ trung tính, cần nỗ lực từ cả hai bên.`,
  };
}

// =============================================================================
// getYearElement
// =============================================================================

/**
 * Tra ngũ hành của năm sinh theo quy tắc Thiên Can (Can Chi):
 *  - 0, 1 (Giáp, Ất) → WOOD
 *  - 2, 3 (Bính, Đinh) → FIRE
 *  - 4, 5 (Mậu, Kỷ) → EARTH
 *  - 6, 7 (Canh, Tân) → METAL
 *  - 8, 9 (Nhâm, Quý) → WATER
 *
 * Verify: 2024 (số cuối 4) → WOOD (năm Giáp Thìn). ✓
 *         2020 (số cuối 0) → METAL (năm Canh Tý). ✓
 */
export function getYearElement(dob: string): Element | null {
  const parts = parseDobParts(dob);
  if (!parts) return null;
  const lastDigit = ((parts.year % 10) + 10) % 10;
  switch (lastDigit) {
    case 0:
    case 1:
      return 'METAL';
    case 2:
    case 3:
      return 'WATER';
    case 4:
    case 5:
      return 'WOOD';
    case 6:
    case 7:
      return 'FIRE';
    case 8:
    case 9:
      return 'EARTH';
    default:
      return null;
  }
}
