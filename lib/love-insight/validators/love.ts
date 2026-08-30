/**
 * Zod validators cho API inputs.
 *
 * Quy ước:
 *  - Tên: 2–80 ký tự sau trim, không chứa email/phone/URL.
 *  - DOB: YYYY-MM-DD, không ở tương lai, không quá xa trong quá khứ.
 *  - privacyMode: phải là 1 trong 3 giá trị enum.
 *  - relationshipStatus: optional, free string (giữ linh hoạt).
 *
 * Mỗi schema có phiên bản parse() trả về `{ ok, data } | { ok, error }` thuận
 * tiện cho API handlers (không phải throw).
 */

import { z } from 'zod';
import {
  isPrivacyMode,
  isRelationshipStatus,
} from '@/lib/love-insight/shared';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_YEAR = 1900;
const NAME_MIN = 2;
const NAME_MAX = 80;

// =============================================================================
// Shared sub-schemas
// =============================================================================

const PrivacyModeSchema = z.string().refine(isPrivacyMode, {
  message: 'Chế độ riêng tư không hợp lệ (chỉ chấp nhận FULL_NAMES / INITIALS / HIDDEN).',
});

const RelationshipStatusSchema = z
  .string()
  .refine(
    (v) => v === '' || isRelationshipStatus(v),
    { message: 'Trạng thái quan hệ không hợp lệ.' },
  )
  .optional();

const NameSchema = z
  .string()
  .trim()
  .min(NAME_MIN, `Tên phải có ít nhất ${NAME_MIN} ký tự.`)
  .max(NAME_MAX, `Tên không được vượt quá ${NAME_MAX} ký tự.`)
  .refine((v) => !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v), {
    message: 'Tên không được chứa email.',
  })
  .refine((v) => !/(?:\+?84|0)(?:[\s.-]?\d){8,11}\d/.test(v), {
    message: 'Tên không được chứa số điện thoại.',
  })
  .refine((v) => !/(https?:\/\/|www\.|[A-Z0-9-]+\.(?:com|net|org|io|vn|co|uk|app|dev|ai)\b)/i.test(v), {
    message: 'Tên không được chứa liên kết.',
  });

const DobSchema = z
  .string()
  .regex(ISO_DATE_RE, 'Ngày sinh phải có định dạng YYYY-MM-DD.')
  .refine((v) => {
    const parts = v.split('-').map(Number);
    const year = parts[0] ?? 0;
    const month = parts[1] ?? 0;
    const day = parts[2] ?? 0;
    if (year < MIN_YEAR) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const probe = new Date(year, month - 1, day);
    return (
      probe.getFullYear() === year &&
      probe.getMonth() === month - 1 &&
      probe.getDate() === day
    );
  }, 'Ngày sinh không hợp lệ (kiểm tra ngày/tháng/năm có tồn tại).')
  .refine((v) => {
    const parts = v.split('-').map(Number);
    const probe = new Date((parts[0] ?? 0), (parts[1] ?? 1) - 1, parts[2] ?? 1);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return probe.getTime() <= today.getTime();
  }, 'Ngày sinh không được ở tương lai.')
  .refine((v) => {
    const year = Number(v.split('-')[0] ?? 0);
    if (!year) return false;
    const age = new Date().getFullYear() - year;
    return age >= 0 && age <= 130;
  }, 'Tuổi không hợp lệ (ngoài khoảng 0–130).');

// =============================================================================
// Public request schemas
// =============================================================================

const PersonNameOnlySchema = z.object({
  name: NameSchema,
});

const PersonNameDobSchema = z.object({
  name: NameSchema,
  dob: DobSchema,
});

export const NameReadingRequestSchema = z.object({
  personA: PersonNameOnlySchema,
  personB: PersonNameOnlySchema,
  relationshipStatus: RelationshipStatusSchema,
  privacyMode: PrivacyModeSchema,
});

export const NameDobReadingRequestSchema = z.object({
  personA: PersonNameDobSchema,
  personB: PersonNameDobSchema,
  relationshipStatus: RelationshipStatusSchema,
  privacyMode: PrivacyModeSchema,
});

// =============================================================================
// Parse helpers
// =============================================================================

export type NameReadingRequest = z.infer<typeof NameReadingRequestSchema>;
export type NameDobReadingRequest = z.infer<typeof NameDobReadingRequestSchema>;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function parseNameReading(input: unknown): ValidationResult<NameReadingRequest> {
  const result = NameReadingRequestSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const first = result.error.issues[0];
  return {
    ok: false,
    error: first ? first.message : 'Dữ liệu không hợp lệ.',
  };
}

export function parseNameDobReading(
  input: unknown,
): ValidationResult<NameDobReadingRequest> {
  const result = NameDobReadingRequestSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const first = result.error.issues[0];
  return {
    ok: false,
    error: first ? first.message : 'Dữ liệu không hợp lệ.',
  };
}
