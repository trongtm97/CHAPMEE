/**
 * Normalize tên tiếng Việt cho scoring engine.
 * Pure functions, không phụ thuộc DOM hay network.
 */

import type { PrivacyMode } from '@/lib/love-insight/shared';

// =============================================================================
// Constants
// =============================================================================

/** Tổng hợp các combining marks dùng trong tiếng Việt (NFD decomposition). */
const VIETNAMESE_COMBINING_MARKS = /[̀-ͯ⃛]/g;

const MAX_NAME_LENGTH = 80;
const MIN_NAME_LENGTH = 2;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?84|0)(?:[\s.-]?\d){8,11}\d/;
const URL_RE = /(?:https?:\/\/|www\.|[A-Z0-9-]+\.(?:com|net|org|io|vn|co|uk|info|biz|me|app|dev|ai)\b)/i;

// =============================================================================
// 1. removeVietnameseDiacritics
// =============================================================================

export function removeVietnameseDiacritics(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  return input
    .normalize('NFD')
    .replace(VIETNAMESE_COMBINING_MARKS, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// =============================================================================
// 2. normalizeName
// =============================================================================

export function normalizeName(name: string): string {
  if (typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
    .toUpperCase()
    .normalize('NFD')
    .replace(VIETNAMESE_COMBINING_MARKS, '')
    .replace(/đ/g, 'D')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// =============================================================================
// 3. splitVietnameseName
// =============================================================================

export interface SplitName {
  originalName: string;
  normalizedName: string;
  familyName: string | null;
  middleNames: string[];
  givenName: string;
  wordCount: number;
}

export function splitVietnameseName(name: string): SplitName {
  const original = typeof name === 'string' ? name.trim() : '';
  const normalized = normalizeName(name);
  const words = normalized.length > 0 ? normalized.split(' ').filter(Boolean) : [];

  if (words.length === 0) {
    return {
      originalName: original,
      normalizedName: '',
      familyName: null,
      middleNames: [],
      givenName: '',
      wordCount: 0,
    };
  }

  if (words.length === 1) {
    const only = words[0] as string;
    return {
      originalName: original,
      normalizedName: normalized,
      familyName: null,
      middleNames: [],
      givenName: only,
      wordCount: 1,
    };
  }

  if (words.length === 2) {
    return {
      originalName: original,
      normalizedName: normalized,
      familyName: words[0] as string,
      middleNames: [],
      givenName: words[1] as string,
      wordCount: 2,
    };
  }

  // 3+ words
  return {
    originalName: original,
    normalizedName: normalized,
    familyName: words[0] as string,
    middleNames: words.slice(1, -1),
    givenName: words[words.length - 1] as string,
    wordCount: words.length,
  };
}

// =============================================================================
// 4. getInitial
// =============================================================================

export function getInitial(name: string): string {
  const split = splitVietnameseName(name);
  if (!split.givenName) return '?';
  return split.givenName.charAt(0).toUpperCase();
}

// =============================================================================
// 5. safeDisplayPair
// =============================================================================

export function safeDisplayPair(
  personAName: string,
  personBName: string,
  privacyMode: PrivacyMode,
): string {
  if (privacyMode === 'HIDDEN') {
    return 'Một kết nối bí mật ❤️';
  }
  if (privacyMode === 'INITIALS') {
    return `${getInitial(personAName)} ❤️ ${getInitial(personBName)}`;
  }
  const a = (personAName ?? '').trim() || '?';
  const b = (personBName ?? '').trim() || '?';
  return `${a} ❤️ ${b}`;
}

// =============================================================================
// 6. validateName
// =============================================================================

export interface NameValidation {
  valid: boolean;
  message?: string;
}

export function validateName(name: string): NameValidation {
  if (typeof name !== 'string') {
    return { valid: false, message: 'Tên không hợp lệ.' };
  }
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, message: 'Tên không được để trống.' };
  }
  if (trimmed.length < MIN_NAME_LENGTH) {
    return { valid: false, message: `Tên phải có ít nhất ${MIN_NAME_LENGTH} ký tự.` };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, message: `Tên không được vượt quá ${MAX_NAME_LENGTH} ký tự.` };
  }
  if (EMAIL_RE.test(trimmed)) {
    return { valid: false, message: 'Tên không được chứa địa chỉ email.' };
  }
  if (PHONE_RE.test(trimmed)) {
    return { valid: false, message: 'Tên không được chứa số điện thoại.' };
  }
  if (URL_RE.test(trimmed)) {
    return { valid: false, message: 'Tên không được chứa liên kết.' };
  }

  return { valid: true };
}
