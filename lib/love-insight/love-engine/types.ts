/**
 * Engine-internal types cho scoring engine.
 * Public API contract (response) sống trong `@/lib/love-insight/shared` —
 * file này chỉ dùng trong `apps/web/src/lib/love-engine`.
 *
 * Engine KHÔNG có premium / lockedSections / payment / user login —
 * mọi trường trả về đều hiển thị miễn phí cho người dùng cuối.
 */

import type {
  DisplayNames as SharedDisplayNames,
  Initials as SharedInitials,
  ReadingType,
} from '@/lib/love-insight/shared';
import type {
  AdHintWithReason,
  AdviceItem,
  CalculationBreakdownItem,
  InsightItem,
  RiskItem,
  StrengthItem,
} from './explanation';

export type PrivacyMode = 'FULL_NAMES' | 'INITIALS' | 'HIDDEN';

export interface PersonInput {
  name: string;
  dob?: string;
}

export interface LoveInput {
  personA: PersonInput;
  personB: PersonInput;
  relationshipStatus?: string;
  privacyMode: PrivacyMode;
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

export interface Subscores {
  emotional: number;
  communication: number;
  chemistry: number;
  stability: number;
  conflictRisk: number;
  longTerm: number;
}

export interface AdHint {
  position: 'after_summary' | 'after_subscores' | 'after_insights' | 'bottom';
  enabled: boolean;
}

export interface LoveReadingResult {
  readingType: ReadingType;
  totalScore: number;
  levelLabel: string;
  subscores: Subscores;
  modules: ModuleResult[];
  reasonCodes: string[];
  summary: string;
  trustExplanation: string;
  calculationBreakdown: CalculationBreakdownItem[];
  personalizedInsights: InsightItem[];
  strengths: StrengthItem[];
  risks: RiskItem[];
  advice: AdviceItem[];
  adHints: AdHintWithReason[];
  inputHash: string;
  displayNames: SharedDisplayNames;
  initials: SharedInitials;
}

export interface DbData {
  nameA?: import('./nameSemantics').NameSemanticsData;
  nameB?: import('./nameSemantics').NameSemanticsData;
}
