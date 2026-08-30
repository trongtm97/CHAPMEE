/**
 * Ý nghĩa tên + semantic tags cho scoring engine.
 * Pure functions, deterministic. Dữ liệu VietnameseName từ database.
 */

import { REASON_CODES } from '@/lib/love-insight/shared';

// =============================================================================
// Types
// =============================================================================

export type SymbolicElement = 'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER' | 'UNKNOWN';

export interface NameSemanticsData {
  name: string;
  meaning: string;
  semanticTags: readonly string[];
  symbolicElement: SymbolicElement;
  loveStyle: string;
  strengths: string;
  risks: string;
  advice: string;
}

export interface NameSemanticScore {
  score: number;
  rawValues: {
    nameAMeaning: string;
    nameBMeaning: string;
    nameATags: readonly string[];
    nameBTags: readonly string[];
    elementA: SymbolicElement;
    elementB: SymbolicElement;
    commonTags: string[];
    appliedRules: string[];
  };
  reasonCodes: string[];
  explanation: string;
}

// =============================================================================
// Five-element relationships
// =============================================================================

/** Tương sinh: A sinh B (forward) hoặc B sinh A (reverse) — tích cực. */
const GENERATING_FORWARD = new Set([
  'WOOD_FIRE',
  'FIRE_EARTH',
  'EARTH_METAL',
  'METAL_WATER',
  'WATER_WOOD',
]);

/** Tương khắc: A khắc B hoặc B khắc A — tiêu cực. */
const CONTROLLING = new Set([
  'WOOD_EARTH',
  'EARTH_WATER',
  'WATER_FIRE',
  'FIRE_METAL',
  'METAL_WOOD',
]);

function isGenerating(a: SymbolicElement, b: SymbolicElement): boolean {
  if (a === 'UNKNOWN' || b === 'UNKNOWN') return false;
  return GENERATING_FORWARD.has(`${a}_${b}`) || GENERATING_FORWARD.has(`${b}_${a}`);
}

function isControlling(a: SymbolicElement, b: SymbolicElement): boolean {
  if (a === 'UNKNOWN' || b === 'UNKNOWN') return false;
  return CONTROLLING.has(`${a}_${b}`) || CONTROLLING.has(`${b}_${a}`);
}

// =============================================================================
// Tag rules
// =============================================================================

const TAG_RISK = 'passionate_sensitive';
const TAG_SAME_TAG_BONUS = 4;
const TAG_SAME_TAG_CAP = 12;
const GENTLE_STRONG_BONUS = 6;
const FAMILY_FAMILY_BONUS = 10;
const FREE_SPIRIT_FAMILY_PENALTY = -6;
const AMBITIOUS_CALM_BONUS = 4;
const PASSIONATE_SENSITIVE_BONUS = 2;

const SAME_ELEMENT_BONUS = 6;
const GENERATING_BONUS = 10;
const CONTROLLING_PENALTY = -12;

const SCORE_MIN = 40;
const SCORE_MAX = 95;

function normalizeTags(tags: readonly string[]): Set<string> {
  return new Set(tags.map((t) => t.toLowerCase().trim()).filter(Boolean));
}

function intersect(a: Set<string>, b: Set<string>): string[] {
  const out: string[] = [];
  for (const t of a) if (b.has(t)) out.push(t);
  return out;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// =============================================================================
// scoreNameSemanticMatch
// =============================================================================

export function scoreNameSemanticMatch(
  nameAData: NameSemanticsData,
  nameBData: NameSemanticsData,
): NameSemanticScore {
  const tagsA = normalizeTags(nameAData.semanticTags);
  const tagsB = normalizeTags(nameBData.semanticTags);
  const commonTags = intersect(tagsA, tagsB);

  const reasonCodes: string[] = [];
  const appliedRules: string[] = [];
  let score = 70;

  // 1. Cùng semantic tag: +4 mỗi tag, tối đa +12.
  const tagBonus = Math.min(commonTags.length * TAG_SAME_TAG_BONUS, TAG_SAME_TAG_CAP);
  if (tagBonus > 0) {
    score += tagBonus;
    reasonCodes.push(REASON_CODES.NAME_SEMANTIC_TAGS_OVERLAP);
    appliedRules.push(`common_tags_+${tagBonus}(${commonTags.length})`);
  }

  // 2. gentle + strong: +6 (một bên gentle, một bên strong).
  const aHasGentle = tagsA.has('gentle') || tagsA.has('nhẹ nhàng');
  const aHasStrong = tagsA.has('strong') || tagsA.has('mạnh mẽ');
  const bHasGentle = tagsB.has('gentle') || tagsB.has('nhẹ nhàng');
  const bHasStrong = tagsB.has('strong') || tagsB.has('mạnh mẽ');
  if ((aHasGentle && bHasStrong) || (aHasStrong && bHasGentle)) {
    score += GENTLE_STRONG_BONUS;
    reasonCodes.push(REASON_CODES.NAME_SEMANTIC_TAGS_OVERLAP);
    appliedRules.push(`gentle_strong_+${GENTLE_STRONG_BONUS}`);
  }

  // 3. family_oriented + family_oriented: +10.
  const familyTag = 'family_oriented';
  if (tagsA.has(familyTag) && tagsB.has(familyTag)) {
    score += FAMILY_FAMILY_BONUS;
    reasonCodes.push(REASON_CODES.NAME_SEMANTIC_TAGS_OVERLAP);
    appliedRules.push(`family_x2_+${FAMILY_FAMILY_BONUS}`);
  }

  // 4. free_spirit + family_oriented: -6.
  if (
    (tagsA.has('free_spirit') && tagsB.has(familyTag)) ||
    (tagsB.has('free_spirit') && tagsA.has(familyTag))
  ) {
    score += FREE_SPIRIT_FAMILY_PENALTY;
    reasonCodes.push(REASON_CODES.NAME_SEMANTIC_TAGS_OVERLAP);
    appliedRules.push(`free_spirit_family_${FREE_SPIRIT_FAMILY_PENALTY}`);
  }

  // 5. ambitious + calm: +4.
  if (
    (tagsA.has('ambitious') && tagsB.has('calm')) ||
    (tagsB.has('ambitious') && tagsA.has('calm'))
  ) {
    score += AMBITIOUS_CALM_BONUS;
    reasonCodes.push(REASON_CODES.NAME_SEMANTIC_TAGS_OVERLAP);
    appliedRules.push(`ambitious_calm_+${AMBITIOUS_CALM_BONUS}`);
  }

  // 6. passionate + sensitive: +2 và thêm risk code.
  if (
    (tagsA.has('passionate') && tagsB.has('sensitive')) ||
    (tagsB.has('passionate') && tagsA.has('sensitive'))
  ) {
    score += PASSIONATE_SENSITIVE_BONUS;
    reasonCodes.push(REASON_CODES.NAME_SEMANTIC_TAGS_OVERLAP);
    reasonCodes.push(REASON_CODES.NAME_SEMANTIC_RISK);
    appliedRules.push(`passionate_sensitive_+${PASSIONATE_SENSITIVE_BONUS}`);
  }

  // 7. Cùng symbolicElement: +6.
  if (
    nameAData.symbolicElement === nameBData.symbolicElement &&
    nameAData.symbolicElement !== 'UNKNOWN'
  ) {
    score += SAME_ELEMENT_BONUS;
    reasonCodes.push(REASON_CODES.ELEMENT_GENERATING);
    appliedRules.push(`same_element_+${SAME_ELEMENT_BONUS}`);
  }

  // 8. Five element tương sinh: +10.
  if (isGenerating(nameAData.symbolicElement, nameBData.symbolicElement)) {
    score += GENERATING_BONUS;
    reasonCodes.push(REASON_CODES.ELEMENT_GENERATING);
    appliedRules.push(`generating_+${GENERATING_BONUS}`);
  }

  // 9. Five element tương khắc mạnh: -12.
  if (isControlling(nameAData.symbolicElement, nameBData.symbolicElement)) {
    score += CONTROLLING_PENALTY;
    reasonCodes.push(REASON_CODES.ELEMENT_CLASH);
    appliedRules.push(`clash_${CONTROLLING_PENALTY}`);
  }

  const finalScore = clamp(score, SCORE_MIN, SCORE_MAX);

  return {
    score: finalScore,
    rawValues: {
      nameAMeaning: nameAData.meaning,
      nameBMeaning: nameBData.meaning,
      nameATags: nameAData.semanticTags,
      nameBTags: nameBData.semanticTags,
      elementA: nameAData.symbolicElement,
      elementB: nameBData.symbolicElement,
      commonTags,
      appliedRules,
    },
    reasonCodes,
    explanation: buildExplanation(nameAData, nameBData, finalScore, reasonCodes, appliedRules),
  };
}

// =============================================================================
// Explanation builder
// =============================================================================

function truncateSnippet(text: string, maxLen = 80): string {
  const t = (text ?? '').trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

function buildExplanation(
  a: NameSemanticsData,
  b: NameSemanticsData,
  score: number,
  reasonCodes: string[],
  appliedRules: string[],
): string {
  const aStyle = truncateSnippet(a.loveStyle || a.meaning);
  const bStyle = truncateSnippet(b.loveStyle || b.meaning);

  const opener = `Tên ${a.name} thường gắn với ${aStyle}, trong khi tên ${b.name} mang sắc thái ${bStyle}.`;

  const interaction: string[] = [];

  if (reasonCodes.includes(REASON_CODES.ELEMENT_CLASH)) {
    interaction.push(
      `Hai năng lượng ngũ hành ${a.symbolicElement} và ${b.symbolicElement} ở thế tương khắc — cần chủ động dung hoà và nhường nhau.`,
    );
  } else if (
    reasonCodes.includes(REASON_CODES.ELEMENT_GENERATING) &&
    appliedRules.some((r) => r.startsWith('generating_'))
  ) {
    interaction.push(
      `Ngũ hành ${a.symbolicElement} và ${b.symbolicElement} tương sinh — hai bên hỗ trợ và cộng hưởng cho nhau.`,
    );
  }

  if (
    reasonCodes.includes(REASON_CODES.NAME_SEMANTIC_RISK) &&
    appliedRules.some((r) => r.startsWith('passionate_sensitive'))
  ) {
    interaction.push(
      `Một bên sôi nổi, một bên nhạy cảm — cần chú ý cách nói chuyện để không làm tổn thương nhau.`,
    );
  }

  if (reasonCodes.includes(REASON_CODES.NAME_SEMANTIC_TAGS_OVERLAP)) {
    const tagCount = (rawValuesCommonTags(a, b)).length;
    if (tagCount >= 2 && interaction.length === 0) {
      interaction.push(
        `Hai tên chia sẻ ${tagCount} đặc điểm chung — nhìn chung dễ đồng cảm.`,
      );
    }
  }

  if (interaction.length === 0) {
    if (score >= 80) {
      interaction.push(
        `Khi đặt cạnh nhau, hai năng lượng này tạo cảm giác cộng hưởng tốt.`,
      );
    } else if (score >= 60) {
      interaction.push(
        `Khi đặt cạnh nhau, hai năng lượng này có thể bổ khuyết cho nhau nếu biết lắng nghe.`,
      );
    } else {
      interaction.push(
        `Khi đặt cạnh nhau, cần ý thức và thời gian để hai năng lượng tìm tiếng nói chung.`,
      );
    }
  }

  return `${opener} ${interaction.join(' ')}`;
}

function rawValuesCommonTags(a: NameSemanticsData, b: NameSemanticsData): string[] {
  const aSet = normalizeTags(a.semanticTags);
  const bSet = normalizeTags(b.semanticTags);
  return intersect(aSet, bSet);
}
