/**
 * Shared runtime validators — type guards + request sanity checks.
 * Dùng cho cả web và mobile trước khi gọi API hoặc khi parse response.
 */

import {
  PRIVACY_MODES,
  RELATIONSHIP_STATUSES,
  type ApiError,
  type LoveNameDobRequest,
  type LoveNameRequest,
  type PersonInput,
  type PrivacyMode,
  type RelationshipStatus,
} from './types';
import { ERROR_CODES } from './constants';

export function isPrivacyMode(value: unknown): value is PrivacyMode {
  return typeof value === 'string' && (PRIVACY_MODES as readonly string[]).includes(value);
}

export function isRelationshipStatus(value: unknown): value is RelationshipStatus {
  return (
    typeof value === 'string' &&
    (RELATIONSHIP_STATUSES as readonly string[]).includes(value)
  );
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function isPersonInput(value: unknown): value is PersonInput {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!isNonEmptyString(v.name)) return false;
  if (v.dob === undefined) return true;
  return isValidIsoDate(v.dob);
}

export type ValidationOk<T> = { ok: true; data: T };
export type ValidationFail = { ok: false; error: ApiError };

export function invalidInput(message: string, details?: unknown): ValidationFail {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.INVALID_INPUT,
      message,
      details,
    },
  };
}

export function validateLoveNameRequest(
  payload: unknown,
): ValidationOk<LoveNameRequest> | ValidationFail {
  if (!payload || typeof payload !== 'object') {
    return invalidInput('Payload không hợp lệ.');
  }
  const p = payload as Partial<LoveNameRequest>;
  if (!p.personA || !isNonEmptyString(p.personA.name)) {
    return invalidInput('Thiếu tên người thứ nhất.');
  }
  if (!p.personB || !isNonEmptyString(p.personB.name)) {
    return invalidInput('Thiếu tên người thứ hai.');
  }
  if (!isPrivacyMode(p.privacyMode)) {
    return invalidInput('Chế độ riêng tư không hợp lệ.');
  }
  if (
    p.relationshipStatus !== undefined &&
    !isRelationshipStatus(p.relationshipStatus)
  ) {
    return invalidInput('Trạng thái quan hệ không hợp lệ.');
  }
  return { ok: true, data: payload as LoveNameRequest };
}

export function validateLoveNameDobRequest(
  payload: unknown,
): ValidationOk<LoveNameDobRequest> | ValidationFail {
  if (!payload || typeof payload !== 'object') {
    return invalidInput('Payload không hợp lệ.');
  }
  const p = payload as Partial<LoveNameDobRequest>;
  if (!p.personA || !isNonEmptyString(p.personA.name)) {
    return invalidInput('Thiếu tên người thứ nhất.');
  }
  if (!isValidIsoDate(p.personA?.dob)) {
    return invalidInput('Ngày sinh người thứ nhất không hợp lệ (định dạng YYYY-MM-DD).');
  }
  if (!p.personB || !isNonEmptyString(p.personB.name)) {
    return invalidInput('Thiếu tên người thứ hai.');
  }
  if (!isValidIsoDate(p.personB?.dob)) {
    return invalidInput('Ngày sinh người thứ hai không hợp lệ (định dạng YYYY-MM-DD).');
  }
  if (!isPrivacyMode(p.privacyMode)) {
    return invalidInput('Chế độ riêng tư không hợp lệ.');
  }
  if (
    p.relationshipStatus !== undefined &&
    !isRelationshipStatus(p.relationshipStatus)
  ) {
    return invalidInput('Trạng thái quan hệ không hợp lệ.');
  }
  return { ok: true, data: payload as LoveNameDobRequest };
}

export function isApiErrorLike(value: unknown): value is ApiError {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.code === 'string' && typeof v.message === 'string';
}
