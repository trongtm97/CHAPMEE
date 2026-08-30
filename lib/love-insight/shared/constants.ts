/**
 * Shared constants — dùng chung cho web, mobile, và backend.
 * Không chứa logic, chỉ giá trị tĩnh + path chuẩn.
 */

export const API_VERSION = 'v1';

export const MAX_SCORE = 100;
export const MIN_SCORE = 0;

export const DEFAULT_PRIVACY_MODE = 'INITIALS' as const;
export const DEFAULT_RELATIONSHIP_STATUS = 'UNKNOWN' as const;
export const DEFAULT_TIMEOUT_MS = 15_000;

export const DISCLAIMER =
  'Kết quả mang tính giải trí, tham khảo và tự khám phá cảm xúc. Không nên dùng như cơ sở duy nhất để đưa ra quyết định quan trọng trong tình cảm.';

export const SAFE_OPENINGS = [
  'Dữ liệu biểu tượng cho thấy',
  'Điểm số này gợi ý rằng',
  'Năng lượng hiện tại nghiêng về',
  'Có xu hướng',
] as const;

export const SAFE_LEVEL_LABELS = [
  'Rất hài hoà',
  'Hài hoà',
  'Có tiềm năng',
  'Cần chú ý',
  'Nhiều thử thách',
] as const;

export const REASON_CODES = {
  NUMEROLOGY_HARMONY: 'NUMEROLOGY_HARMONY',
  NUMEROLOGY_TENSION: 'NUMEROLOGY_TENSION',
  ZODIAC_TRINE: 'ZODIAC_TRINE',
  ZODIAC_SQUARE: 'ZODIAC_SQUARE',
  ZODIAC_ELEMENT_HARMONY: 'ZODIAC_ELEMENT_HARMONY',
  ZODIAC_ELEMENT_FRICTION: 'ZODIAC_ELEMENT_FRICTION',
  ZODIAC_MODALITY_MATCH: 'ZODIAC_MODALITY_MATCH',
  ZODIAC_MODALITY_TENSION: 'ZODIAC_MODALITY_TENSION',
  ELEMENT_GENERATING: 'ELEMENT_GENERATING',
  ELEMENT_CLASH: 'ELEMENT_CLASH',
  ELEMENT_SAME: 'ELEMENT_SAME',
  ELEMENT_NEUTRAL: 'ELEMENT_NEUTRAL',
  CHINESE_TAM_HOP: 'CHINESE_TAM_HOP',
  CHINESE_LUC_HOP: 'CHINESE_LUC_HOP',
  CHINESE_LUC_XUNG: 'CHINESE_LUC_XUNG',
  CHINESE_NEUTRAL: 'CHINESE_NEUTRAL',
  NAME_PHONETIC: 'NAME_PHONETIC',
  NAME_RHYTHM_MATCH: 'NAME_RHYTHM_MATCH',
  NAME_ENDING_MATCH: 'NAME_ENDING_MATCH',
  NAME_SOFT_BALANCE: 'NAME_SOFT_BALANCE',
  NAME_STRONG_COLLISION: 'NAME_STRONG_COLLISION',
  NAME_SOUND_COMPLEMENT: 'NAME_SOUND_COMPLEMENT',
  NAME_SEMANTIC_TAGS_OVERLAP: 'NAME_SEMANTIC_TAGS_OVERLAP',
  NAME_SEMANTIC_RISK: 'NAME_SEMANTIC_RISK',
  INSUFFICIENT_DOB: 'INSUFFICIENT_DOB',
} as const;
export type ReasonCode = (typeof REASON_CODES)[keyof typeof REASON_CODES];

/** Endpoint paths dùng chung. */
export const API_PATHS = {
  loveName: '/api/v1/love/name',
  loveNameDob: '/api/v1/love/name-dob',
  result: (id: string) => `/api/v1/result/${encodeURIComponent(id)}`,
  share: (shareId: string) => `/api/v1/share/${encodeURIComponent(shareId)}`,
} as const;

export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  PARSE_ERROR: 'PARSE_ERROR',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  HTTP_NOT_FOUND: 'HTTP_NOT_FOUND',
  HTTP_SERVER_ERROR: 'HTTP_SERVER_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | `HTTP_${number}`;
