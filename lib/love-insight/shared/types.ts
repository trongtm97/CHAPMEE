/**
 * Shared types — dùng chung cho web, mobile, và backend.
 * Không chứa logic runtime, chỉ type + enum objects.
 */

// =============================================================================
// Privacy
// =============================================================================

export const PrivacyMode = {
  FULL_NAMES: 'FULL_NAMES',
  INITIALS: 'INITIALS',
  HIDDEN: 'HIDDEN',
} as const;
export type PrivacyMode = (typeof PrivacyMode)[keyof typeof PrivacyMode];

export const PRIVACY_MODES: readonly PrivacyMode[] = [
  PrivacyMode.FULL_NAMES,
  PrivacyMode.INITIALS,
  PrivacyMode.HIDDEN,
] as const;

export const PRIVACY_MODE_LABELS: Record<PrivacyMode, string> = {
  FULL_NAMES: 'Hiện tên đầy đủ',
  INITIALS: 'Chỉ chữ cái đầu',
  HIDDEN: 'Ẩn hoàn toàn',
};

// =============================================================================
// Relationship status
// =============================================================================

export const RelationshipStatus = {
  CRUSH: 'CRUSH',
  SITUATIONSHIP: 'SITUATIONSHIP',
  DATING: 'DATING',
  LONG_DISTANCE: 'LONG_DISTANCE',
  EX: 'EX',
  MARRIED: 'MARRIED',
  UNKNOWN: 'UNKNOWN',
} as const;
export type RelationshipStatus = (typeof RelationshipStatus)[keyof typeof RelationshipStatus];

export const RELATIONSHIP_STATUSES: readonly RelationshipStatus[] = [
  RelationshipStatus.CRUSH,
  RelationshipStatus.SITUATIONSHIP,
  RelationshipStatus.DATING,
  RelationshipStatus.LONG_DISTANCE,
  RelationshipStatus.EX,
  RelationshipStatus.MARRIED,
  RelationshipStatus.UNKNOWN,
] as const;

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  CRUSH: 'Đang thích',
  SITUATIONSHIP: 'Tình trạng phức tạp',
  DATING: 'Đang hẹn hò',
  LONG_DISTANCE: 'Yêu xa',
  EX: 'Đã chia tay',
  MARRIED: 'Đã kết hôn',
  UNKNOWN: 'Không tiện chia sẻ',
};

// =============================================================================
// Reading type
// =============================================================================

export const ReadingType = {
  NAME_ONLY: 'NAME_ONLY',
  NAME_DOB: 'NAME_DOB',
} as const;
export type ReadingType = (typeof ReadingType)[keyof typeof ReadingType];

// =============================================================================
// Request shapes
// =============================================================================

export interface PersonInput {
  name: string;
  dob?: string;
}

export interface LoveNameRequest {
  personA: Pick<PersonInput, 'name'>;
  personB: Pick<PersonInput, 'name'>;
  relationshipStatus?: RelationshipStatus;
  privacyMode: PrivacyMode;
}

export interface LoveNameDobRequest {
  personA: Required<PersonInput>;
  personB: Required<PersonInput>;
  relationshipStatus?: RelationshipStatus;
  privacyMode: PrivacyMode;
}

// =============================================================================
// Result shapes
// =============================================================================

export interface Subscores {
  emotional: number;
  communication: number;
  chemistry: number;
  stability: number;
  conflictRisk: number;
  longTerm: number;
}

export interface ModuleResult {
  module: string;
  label: string;
  score: number;
  weight?: number;
  rawValues: Record<string, unknown>;
  reasonCodes: string[];
  explanation: string;
}

export interface DisplayNames {
  personA: string;
  personB: string;
  pair: string;
}

export interface Initials {
  personA: string;
  personB: string;
}

export interface LoveReadingResult {
  id?: string;
  shareId?: string;
  readingType: ReadingType;
  totalScore: number;
  levelLabel: string;
  subscores: Subscores;
  modules: ModuleResult[];
  reasonCodes: string[];
  summary: string;
  trustExplanation: string;
  calculationBreakdown: unknown[];
  personalizedInsights: unknown[];
  strengths: unknown[];
  risks: unknown[];
  advice: unknown[];
  displayNames: DisplayNames;
  initials: Initials;
}

// =============================================================================
// API envelope
// =============================================================================

/** Response thành công của createNameReading / createNameDobReading. */
export interface ApiResponse {
  readingId: string;
  shareId: string;
  resultUrl: string;
  shareUrl: string;
  result: LoveReadingResult;
}

/** Response lỗi chuẩn từ server. */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Kết quả trả về từ mọi hàm trong api-client.
 * Dùng discriminated union để ép xử lý lỗi tại call site.
 */
export type LoveApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// =============================================================================
// Public share (DTO an toàn cho link chia sẻ)
// =============================================================================

/** Một chỉ số nổi bật hiển thị trên share page (3 chỉ số cố định). */
export interface FeaturedSubscore {
  key: 'emotional' | 'chemistry' | 'longTerm';
  label: string;
  score: number;
}

/**
 * DTO public-safe trả về từ `GET /api/v1/share/[shareId]`.
 *
 * - KHÔNG chứa DOB, personA/personB raw name, modules, breakdown, advice...
 * - `displayPair` đã được apply `privacyMode` ở backend
 *   (HIDDEN → "Một kết nối bí mật ❤️",
 *    INITIALS → "M ❤️ L",
 *    FULL_NAMES → "Minh ❤️ Linh").
 */
export interface PublicShareReading {
  shareId: string;
  totalScore: number;
  levelLabel: string;
  summary: string;
  displayPair: string;
  privacyMode: PrivacyMode;
  topSubscores: Array<{ key: string; label: string; score: number }>;
  featuredSubscores: FeaturedSubscore[];
  createdAt: string;
}
