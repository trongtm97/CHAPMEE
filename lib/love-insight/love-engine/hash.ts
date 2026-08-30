/**
 * Hash + share-id utilities cho love-reading engine.
 *
 * Quy ước:
 *  - createInputHash dùng SHA-256, cùng input luôn ra cùng hash
 *    (kể cả khi thứ tự key trong object khác nhau).
 *  - createShareId dùng crypto randomBytes — chỉ dùng cho shareId,
 *    TUYỆT ĐỐI KHÔNG dùng random cho việc tính điểm tình yêu.
 */

import { createHash, randomBytes } from 'node:crypto';
import type { ReadingType } from '@/lib/love-insight/shared';
import type { PrivacyMode } from './types';

export interface HashableInput {
  personA: { name: string; dob?: string };
  personB: { name: string; dob?: string };
  relationshipStatus?: string;
  privacyMode: PrivacyMode;
  readingType?: ReadingType;
}

// =============================================================================
// Internal helpers
// =============================================================================

function normalizeString(s: string | undefined | null): string {
  return (s ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeName(s: string | undefined | null): string {
  return normalizeString(s).toUpperCase();
}

function normalizeDob(s: string | undefined | null): string {
  return normalizeString(s);
}

// =============================================================================
// createInputHash
// =============================================================================

/**
 * SHA-256 hash (16 hex chars) của input đã chuẩn hoá.
 *
 * Đây là canonical hash cho ChapMee Bói Tình Yêu — dùng cho cả dedup ở route handler
 * lẫn lưu vào DB (`LoveReading.inputHash`). Hai nơi BẮT BUỘC phải trả về cùng
 * giá trị cho cùng input, nếu không route sẽ tìm không thấy row cũ và
 * `prisma.loveReading.create()` sẽ ném unique-constraint violation (500).
 *
 * Quy ước:
 *  - Tên: upper-case + trim + collapse whitespace.
 *  - DOB: giữ nguyên định dạng YYYY-MM-DD (chỉ trim).
 *  - relationshipStatus + privacyMode ảnh hưởng hash (advice theo status,
 *    display theo privacy nên thay đổi kết quả cuối).
 *  - Canonical JSON dựng với key order cố định (type, aName, aDob, bName,
 *    bDob, status, privacy) — KHÔNG sort key tại runtime, vì thứ tự key
 *    trong input do caller truyền vào có thể khác nhau; quan trọng là
 *    canonical luôn có cùng thứ tự → cùng SHA-256.
 *  - Truncate 16 hex chars (64 bit) để khớp với engine & schema DB. Xác suất
 *    collision ≈ 1/2^64 — chấp nhận được cho mục đích dedup.
 */
export function createInputHash(payload: HashableInput): string {
  const canonical = JSON.stringify({
    type: payload.readingType ?? 'NAME_DOB',
    aName: normalizeName(payload.personA.name),
    aDob: normalizeDob(payload.personA.dob),
    bName: normalizeName(payload.personB.name),
    bDob: normalizeDob(payload.personB.dob),
    status: payload.relationshipStatus ?? '',
    privacy: payload.privacyMode,
  });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

// =============================================================================
// createShareId
// =============================================================================

/**
 * Tạo shareId URL-safe, dùng cho URL /share/{shareId}.
 *  - randomBytes từ `crypto` (cryptographically secure).
 *  - Default 12 ký tự base64url (≈ 72 bit entropy — gần như không trùng).
 *  - KHÔNG bao giờ dùng random cho tính điểm tình yêu.
 */
export function createShareId(length = 12): string {
  if (length < 8 || length > 32) {
    throw new Error('createShareId: length phải trong khoảng 8–32.');
  }
  // Cần đủ byte để khi slice còn đủ entropy.
  const bytesNeeded = Math.max(12, Math.ceil((length * 6) / 8) + 2);
  return randomBytes(bytesNeeded).toString('base64url').slice(0, length);
}
