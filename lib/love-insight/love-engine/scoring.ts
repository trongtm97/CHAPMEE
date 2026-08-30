/**
 * Scoring engine tổng — tính điểm tương hợp từ tất cả modules.
 * Pure / deterministic, KHÔNG random. KHÔNG có premium.
 *
 * Hai entry point:
 *  - calculateNameOnlyReading  (chỉ tên)
 *  - calculateNameDobReading   (tên + ngày sinh)
 *
 * Cả hai đều trả về LoveReadingResult đầy đủ với subscores, modules,
 * calculationBreakdown, adHints, inputHash — sẵn sàng để explanation
 * engine (prompt 12) làm giàu narrative nếu cần.
 */

import { createHash } from 'node:crypto';
import type { ReadingType } from '@/lib/love-insight/shared';
import { createInputHash } from './hash';
import {
  getInitial,
  normalizeName,
  safeDisplayPair,
  splitVietnameseName,
} from './normalize';
import {
  calculateAttitudeNumber,
  calculateBirthdayNumber,
  calculateChaldeanName,
  calculateGivenNameNumber,
  calculateLifePath,
  calculatePersonalYear,
  calculatePersonalityNumber,
  calculatePythagoreanName,
  calculateSoulUrge,
} from './numerology';
import { scorePhoneticMatch } from './namePhonetics';
import { scoreNameSemanticMatch } from './nameSemantics';
import { scoreZodiacMatch } from './zodiac';
import { scoreChineseZodiacMatch } from './chineseZodiac';
import { getYearElement, scoreElementPair, type Element } from './fiveElements';
import { buildExplanationContext, buildLoveExplanation } from './explanation';
import type {
  DbData,
  LoveInput,
  LoveReadingResult,
  ModuleResult,
  PrivacyMode,
  Subscores,
} from './types';
import type { NameSemanticsData } from './nameSemantics';

// =============================================================================
// Constants
// =============================================================================

const POLARITY_PAIR_SCORES: Record<string, number> = {
  MASCULINE_FEMININE: 92,
  FEMININE_MASCULINE: 92,
  MASCULINE_MASCULINE: 72,
  FEMININE_FEMININE: 72,
};

const DEFAULT_NEUTRAL_SCORE = 70;
const SCORE_MIN = 0;
const SCORE_MAX = 100;

const AD_HINTS: import('./explanation').AdHintWithReason[] = [
  { position: 'after_summary', enabled: true, reason: 'Placeholder, sẽ được explanation engine thay thế.' },
  { position: 'after_subscores', enabled: true, reason: 'Placeholder.' },
  { position: 'after_insights', enabled: true, reason: 'Placeholder.' },
  { position: 'bottom', enabled: true, reason: 'Placeholder.' },
];

// =============================================================================
// Numerology pair compatibility (engine-internal helper)
// =============================================================================

function numerologyCompatibility(a: number, b: number): number {
  const aIsMaster = a === 11 || a === 22 || a === 33;
  const bIsMaster = b === 11 || b === 22 || b === 33;
  if (aIsMaster && bIsMaster) return 95;
  if (aIsMaster || bIsMaster) return 82;
  const diff = Math.abs(a - b);
  if (diff === 0) return 90;
  if (diff === 1) return 78;
  if (diff === 2) return 65;
  if (diff === 3) return 55;
  if (diff === 4) return 50;
  return 45;
}

function polarityScore(a: 'MASCULINE' | 'FEMININE', b: 'MASCULINE' | 'FEMININE'): number {
  return POLARITY_PAIR_SCORES[`${a}_${b}`] ?? 72;
}

// =============================================================================
// Numeric helpers
// =============================================================================

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampScore(value: number): number {
  return clamp(value, SCORE_MIN, SCORE_MAX);
}

function roundToInt(value: number): number {
  return Math.round(value);
}

function weightedAverage(parts: ReadonlyArray<[number, number]>): number {
  let sum = 0;
  let weight = 0;
  for (const [value, w] of parts) {
    sum += value * w;
    weight += w;
  }
  return weight > 0 ? sum / weight : 0;
}

function getLevelLabel(score: number): string {
  if (score >= 95) return 'Rất đồng điệu';
  if (score >= 85) return 'Kết nối mạnh';
  if (score >= 75) return 'Khá hợp và dễ phát triển';
  if (score >= 60) return 'Có tiềm năng nếu biết điều chỉnh';
  if (score >= 40) return 'Có sức hút nhưng nhiều khác biệt';
  return 'Cần nhiều thấu hiểu';
}

// =============================================================================
// Input hash (deterministic, dùng để dedupe / lookup)
// =============================================================================

/**
 * Tính inputHash cho LoveInput. PHẢI trùng với `createInputHash(payload)` trong
 * hash.ts — cùng giá trị là điều kiện để dedup ở route handler hoạt động
 * đúng (route lookup bằng hash này, DB lưu hash này, nếu lệch nhau sẽ 500).
 *
 * Tách 2 hàm chỉ vì shape input khác nhau (LoveInput vs HashableInput).
 */
function computeInputHash(input: LoveInput, type: ReadingType): string {
  return createInputHash({
    personA: { name: input.personA.name, dob: input.personA.dob },
    personB: { name: input.personB.name, dob: input.personB.dob },
    relationshipStatus: input.relationshipStatus,
    privacyMode: input.privacyMode,
    readingType: type,
  });
}

// =============================================================================
// Display name helpers
// =============================================================================

function getDisplayName(name: string, mode: PrivacyMode): string {
  if (mode === 'HIDDEN') return 'Một kết nối bí mật';
  if (mode === 'INITIALS') return getInitial(name);
  return (name ?? '').trim() || '?';
}

// =============================================================================
// Module builder
// =============================================================================

function buildModule(params: {
  module: string;
  label: string;
  score: number;
  weight: number;
  rawValues: Record<string, unknown>;
  reasonCodes: string[];
  explanation: string;
}): ModuleResult {
  return {
    module: params.module,
    label: params.label,
    score: roundToInt(clampScore(params.score)),
    weight: params.weight,
    rawValues: params.rawValues,
    reasonCodes: params.reasonCodes,
    explanation: params.explanation,
  };
}

function collectReasonCodes(modules: ReadonlyArray<ModuleResult>): string[] {
  const set = new Set<string>();
  for (const m of modules) {
    for (const c of m.reasonCodes) set.add(c);
  }
  return Array.from(set);
}

// =============================================================================
// Name-only reading
// =============================================================================

export function calculateNameOnlyReading(
  input: LoveInput,
  dbData: DbData = {},
): LoveReadingResult {
  const nameA = normalizeName(input.personA.name);
  const nameB = normalizeName(input.personB.name);

  // ----- Numerology helpers -----
  const exprA = calculatePythagoreanName(nameA);
  const exprB = calculatePythagoreanName(nameB);
  const expressionScore = numerologyCompatibility(exprA.number, exprB.number);

  const soulA = calculateSoulUrge(nameA);
  const soulB = calculateSoulUrge(nameB);
  const soulScore = numerologyCompatibility(soulA.number, soulB.number);

  const persA = calculatePersonalityNumber(nameA);
  const persB = calculatePersonalityNumber(nameB);
  const personalityScore = numerologyCompatibility(persA.number, persB.number);

  const splitA = splitVietnameseName(input.personA.name);
  const splitB = splitVietnameseName(input.personB.name);
  const givenA = splitA.givenName || nameA;
  const givenB = splitB.givenName || nameB;
  const givenARes = calculateGivenNameNumber(givenA);
  const givenBRes = calculateGivenNameNumber(givenB);
  const givenNameScore = numerologyCompatibility(givenARes.number, givenBRes.number);

  const chaldA = calculateChaldeanName(nameA);
  const chaldB = calculateChaldeanName(nameB);
  const chaldeanScore = numerologyCompatibility(chaldA.number, chaldB.number);

  // ----- Phonetic -----
  const phonetic = scorePhoneticMatch(nameA, nameB);
  const phoneticScore = phonetic.score;

  // ----- Semantic (uses dbData) -----
  const semanticResult = buildSemanticModule(dbData.nameA, dbData.nameB);
  const semanticScore = semanticResult.score;

  // ----- Name element (uses dbData) -----
  const nameElementResult = buildNameElementModule(dbData.nameA, dbData.nameB);
  const nameElementScore = nameElementResult.score;

  // ----- Total -----
  const totalRaw = weightedAverage([
    [expressionScore, 0.25],
    [soulScore, 0.15],
    [personalityScore, 0.10],
    [givenNameScore, 0.10],
    [chaldeanScore, 0.15],
    [phoneticScore, 0.10],
    [semanticScore, 0.10],
    [nameElementScore, 0.05],
  ]);
  const totalScore = roundToInt(clampScore(totalRaw));

  // ----- Subscores -----
  const emotional = clampScore(
    soulScore * 0.45 + semanticScore * 0.30 + nameElementScore * 0.25,
  );
  const communication = clampScore(
    personalityScore * 0.45 + phoneticScore * 0.35 + expressionScore * 0.20,
  );
  const chemistry = clampScore(
    expressionScore * 0.40 + chaldeanScore * 0.30 + phoneticScore * 0.30,
  );
  const stability = clampScore(
    semanticScore * 0.35 + nameElementScore * 0.35 + givenNameScore * 0.30,
  );
  const conflictRisk = clampScore(
    100 - (expressionScore + soulScore + semanticScore + nameElementScore) / 4,
  );
  const longTerm = clampScore(
    stability * 0.45 + emotional * 0.30 + communication * 0.25,
  );

  const subscores: Subscores = {
    emotional: roundToInt(emotional),
    communication: roundToInt(communication),
    chemistry: roundToInt(chemistry),
    stability: roundToInt(stability),
    conflictRisk: roundToInt(conflictRisk),
    longTerm: roundToInt(longTerm),
  };

  // ----- Modules list -----
  const modules: ModuleResult[] = [
    buildModule({
      module: 'PYTHAGOREAN_EXPRESSION',
      label: 'Pythagorean Expression Match',
      score: expressionScore,
      weight: 0.25,
      rawValues: { a: exprA.number, b: exprB.number, rawSumA: exprA.rawSum, rawSumB: exprB.rawSum },
      reasonCodes: [],
      explanation: 'Tổng năng lượng tên theo hệ Pythagorean — cho biết hai người "tỏa ra" cùng một tần số hay đang lệch nhịp.',
    }),
    buildModule({
      module: 'SOUL_URGE',
      label: 'Soul Urge Match',
      score: soulScore,
      weight: 0.15,
      rawValues: { a: soulA.number, b: soulB.number },
      reasonCodes: [],
      explanation: 'Khát vọng sâu thẳm về tình yêu — khi cả hai cùng khao khát một điều tương tự, mối quan hệ thường bền hơn.',
    }),
    buildModule({
      module: 'PERSONALITY',
      label: 'Personality Match',
      score: personalityScore,
      weight: 0.10,
      rawValues: { a: persA.number, b: persB.number },
      reasonCodes: [],
      explanation: 'Lớp vỏ bên ngoài mỗi người đang khoác lên — ấn tượng đầu tiên hai bên tạo ra cho nhau và cho cả thế giới xung quanh.',
    }),
    buildModule({
      module: 'GIVEN_NAME',
      label: 'Given Name Match',
      score: givenNameScore,
      weight: 0.10,
      rawValues: { a: givenA, b: givenB, aNum: givenARes.number, bNum: givenBRes.number },
      reasonCodes: [],
      explanation: 'Bản sắc riêng của tên gọi — chỉ tính phần tên riêng, không gồm họ, để thấy "bạn là ai" trong từng cái tên.',
    }),
    buildModule({
      module: 'CHALDEAN_NAME',
      label: 'Chaldean Name Match',
      score: chaldeanScore,
      weight: 0.15,
      rawValues: { a: chaldA.number, b: chaldB.number, rawSumA: chaldA.rawSum, rawSumB: chaldB.rawSum },
      reasonCodes: [],
      explanation: 'Rung cảm tên theo hệ Chaldean cổ xưa — soi mặt khác của tên mà hệ Pythagorean chưa nói tới.',
    }),
    buildModule({
      module: 'NAME_PHONETIC',
      label: 'Name Phonetic Match',
      score: phoneticScore,
      weight: 0.10,
      rawValues: {
        syllableDiff: phonetic.rawValues.syllableDiff,
        endingSoundMatch: phonetic.rawValues.endingSoundMatch,
      },
      reasonCodes: phonetic.reasonCodes,
      explanation: phonetic.explanation,
    }),
    semanticResult.module,
    nameElementResult.module,
  ];

  const levelLabel = getLevelLabel(totalScore);

  const displayNames = {
    personA: getDisplayName(input.personA.name, input.privacyMode),
    personB: getDisplayName(input.personB.name, input.privacyMode),
    pair: safeDisplayPair(input.personA.name, input.personB.name, input.privacyMode),
  };
  const initials = {
    personA: getInitial(input.personA.name),
    personB: getInitial(input.personB.name),
  };

  const inputHash = computeInputHash(input, 'NAME_ONLY');

  const explanation = buildLoveExplanation(
    buildExplanationContext({
      input,
      result: {
        readingType: 'NAME_ONLY',
        totalScore,
        levelLabel,
        subscores,
        modules,
        reasonCodes: collectReasonCodes(modules),
        summary: '',
        trustExplanation: '',
        calculationBreakdown: [],
        personalizedInsights: [],
        strengths: [],
        risks: [],
        advice: [],
        adHints: AD_HINTS,
        inputHash,
        displayNames,
        initials,
      },
      dbData,
    }),
  );

  return {
    readingType: 'NAME_ONLY',
    totalScore,
    levelLabel,
    subscores,
    modules,
    reasonCodes: collectReasonCodes(modules),
    summary: explanation.summary,
    trustExplanation: explanation.trustExplanation,
    calculationBreakdown: explanation.calculationBreakdown,
    personalizedInsights: explanation.personalizedInsights,
    strengths: explanation.strengths,
    risks: explanation.risks,
    advice: explanation.advice,
    adHints: explanation.adHints,
    inputHash,
    displayNames,
    initials,
  };
}

// =============================================================================
// Name + DOB reading
// =============================================================================

export function calculateNameDobReading(
  input: LoveInput,
  dbData: DbData = {},
  currentYear: number = new Date().getFullYear(),
): LoveReadingResult {
  const nameA = normalizeName(input.personA.name);
  const nameB = normalizeName(input.personB.name);
  const dobA = input.personA.dob;
  const dobB = input.personB.dob;

  // ----- Hidden numerology helpers (cho subscores) -----
  const exprA = calculatePythagoreanName(nameA);
  const exprB = calculatePythagoreanName(nameB);
  const expressionScore = numerologyCompatibility(exprA.number, exprB.number);

  const soulA = calculateSoulUrge(nameA);
  const soulB = calculateSoulUrge(nameB);
  const soulScore = numerologyCompatibility(soulA.number, soulB.number);

  const persA = calculatePersonalityNumber(nameA);
  const persB = calculatePersonalityNumber(nameB);
  const personalityScore = numerologyCompatibility(persA.number, persB.number);

  const chaldA = calculateChaldeanName(nameA);
  const chaldB = calculateChaldeanName(nameB);
  const chaldeanScore = numerologyCompatibility(chaldA.number, chaldB.number);

  const phonetic = scorePhoneticMatch(nameA, nameB);
  const phoneticScore = phonetic.score;

  // ----- Main "Name numerology" = expression (Pythagorean) -----
  const nameNumerologyScore = expressionScore;

  // ----- Semantic -----
  const semanticResult = buildSemanticModule(dbData.nameA, dbData.nameB);
  const nameSemanticScore = semanticResult.score;

  // ----- DOB-based modules -----
  const lifePathA = dobA ? calculateLifePath(dobA) : null;
  const lifePathB = dobB ? calculateLifePath(dobB) : null;
  const lifePathScore = scoreIfBoth(lifePathA, lifePathB, numerologyCompatibility);

  const birthdayA = dobA ? calculateBirthdayNumber(dobA) : null;
  const birthdayB = dobB ? calculateBirthdayNumber(dobB) : null;
  const birthdayScore = scoreIfBoth(birthdayA, birthdayB, numerologyCompatibility);

  const attitudeA = dobA ? calculateAttitudeNumber(dobA) : null;
  const attitudeB = dobB ? calculateAttitudeNumber(dobB) : null;
  const attitudeScore = scoreIfBoth(attitudeA, attitudeB, numerologyCompatibility);

  // ----- Zodiac -----
  const zodiac = dobA && dobB ? scoreZodiacMatch(dobA, dobB) : null;
  const zodiacElementScore = zodiac?.elementScore ?? DEFAULT_NEUTRAL_SCORE;
  const zodiacModalityScore = zodiac?.modalityScore ?? DEFAULT_NEUTRAL_SCORE;
  const zodiacCombinedScore = zodiac?.score ?? DEFAULT_NEUTRAL_SCORE;
  const polarityScoreVal = zodiac
    ? polarityScore(
        zodiac.rawValues.signA?.polarity ?? 'MASCULINE',
        zodiac.rawValues.signB?.polarity ?? 'FEMININE',
      )
    : DEFAULT_NEUTRAL_SCORE;

  // ----- Chinese zodiac -----
  const chinese = dobA && dobB ? scoreChineseZodiacMatch(dobA, dobB) : null;
  const chineseZodiacScore = chinese?.score ?? DEFAULT_NEUTRAL_SCORE;

  // ----- Five element (ưu tiên symbolicElement từ dbData, fallback year) -----
  const semanticElementA = dbData.nameA?.symbolicElement;
  const semanticElementB = dbData.nameB?.symbolicElement;
  const elementA: Element | null =
    semanticElementA && semanticElementA !== 'UNKNOWN'
      ? (semanticElementA as Element)
      : dobA
        ? getYearElement(dobA)
        : null;
  const elementB: Element | null =
    semanticElementB && semanticElementB !== 'UNKNOWN'
      ? (semanticElementB as Element)
      : dobB
        ? getYearElement(dobB)
        : null;
  const fiveElementResult =
    elementA && elementB ? scoreElementPair(elementA, elementB) : null;
  const fiveElementScore = fiveElementResult?.score ?? DEFAULT_NEUTRAL_SCORE;

  // ----- Personal Year timing -----
  const yearA = dobA ? calculatePersonalYear(dobA, currentYear) : null;
  const yearB = dobB ? calculatePersonalYear(dobB, currentYear) : null;
  const timingScore = scoreIfBoth(yearA, yearB, numerologyCompatibility);

  // ----- Total -----
  const totalRaw = weightedAverage([
    [nameNumerologyScore, 0.18],
    [nameSemanticScore, 0.07],
    [lifePathScore, 0.20],
    [birthdayScore, 0.07],
    [attitudeScore, 0.05],
    [zodiacElementScore, 0.13],
    [zodiacModalityScore, 0.07],
    [chineseZodiacScore, 0.10],
    [fiveElementScore, 0.08],
    [timingScore, 0.05],
  ]);
  const totalScore = roundToInt(clampScore(totalRaw));

  // ----- Subscores (per spec for name-DOB) -----
  const emotional = clampScore(
    soulScore * 0.35 +
      zodiacElementScore * 0.30 +
      birthdayScore * 0.20 +
      fiveElementScore * 0.15,
  );
  const communication = clampScore(
    personalityScore * 0.35 +
      phoneticScore * 0.25 +
      attitudeScore * 0.20 +
      zodiacModalityScore * 0.20,
  );
  const chemistry = clampScore(
    lifePathScore * 0.30 +
      zodiacElementScore * 0.25 +
      expressionScore * 0.25 +
      polarityScoreVal * 0.20,
  );
  const stability = clampScore(
    lifePathScore * 0.30 +
      chineseZodiacScore * 0.20 +
      fiveElementScore * 0.20 +
      zodiacModalityScore * 0.15 +
      nameSemanticScore * 0.15,
  );
  const weightedHarmonyScore = clampScore(
    lifePathScore * 0.25 +
      zodiacCombinedScore * 0.25 +
      chineseZodiacScore * 0.20 +
      fiveElementScore * 0.20 +
      soulScore * 0.10,
  );
  const conflictRisk = clampScore(100 - weightedHarmonyScore);
  const longTerm = clampScore(
    stability * 0.45 +
      lifePathScore * 0.25 +
      chineseZodiacScore * 0.15 +
      fiveElementScore * 0.15,
  );

  const subscores: Subscores = {
    emotional: roundToInt(emotional),
    communication: roundToInt(communication),
    chemistry: roundToInt(chemistry),
    stability: roundToInt(stability),
    conflictRisk: roundToInt(conflictRisk),
    longTerm: roundToInt(longTerm),
  };

  // ----- Modules -----
  const modules: ModuleResult[] = [
    buildModule({
      module: 'NAME_NUMEROLOGY',
      label: 'Name Numerology Score',
      score: nameNumerologyScore,
      weight: 0.18,
      rawValues: { a: exprA.number, b: exprB.number, system: 'Pythagorean' },
      reasonCodes: [],
      explanation: 'Chỉ số Pythagorean Expression của hai tên — bản tóm tắt năng lượng đang chảy trong từng cái tên.',
    }),
    buildModule({
      module: 'NAME_SEMANTIC',
      label: 'Name Semantic Score',
      score: nameSemanticScore,
      weight: 0.07,
      rawValues: semanticResult.module.rawValues,
      reasonCodes: semanticResult.module.reasonCodes,
      explanation: semanticResult.module.explanation,
    }),
    buildModule({
      module: 'LIFE_PATH',
      label: 'Life Path Compatibility',
      score: lifePathScore,
      weight: 0.20,
      rawValues: { a: lifePathA?.number ?? null, b: lifePathB?.number ?? null },
      reasonCodes: [],
      explanation: 'Life Path — con đường đời mỗi người đang đi có chung hướng hay đang rẽ hai ngả.',
    }),
    buildModule({
      module: 'BIRTHDAY_NUMBER',
      label: 'Birthday Number Compatibility',
      score: birthdayScore,
      weight: 0.07,
      rawValues: { a: birthdayA?.number ?? null, b: birthdayB?.number ?? null },
      reasonCodes: [],
      explanation: 'Birthday Number — món quà bẩm sinh hai người mang theo có "cùng tần số" hay không.',
    }),
    buildModule({
      module: 'ATTITUDE_NUMBER',
      label: 'Attitude Number Compatibility',
      score: attitudeScore,
      weight: 0.05,
      rawValues: { a: attitudeA?.number ?? null, b: attitudeB?.number ?? null },
      reasonCodes: [],
      explanation: 'Attitude Number — phong thái mỗi người đối diện thế giới bên ngoài và bước vào một mối quan hệ.',
    }),
    buildModule({
      module: 'ZODIAC_ELEMENT',
      label: 'Zodiac Element Score',
      score: zodiacElementScore,
      weight: 0.13,
      rawValues: { signA: zodiac?.rawValues.signA?.signEn ?? null, signB: zodiac?.rawValues.signB?.signEn ?? null },
      reasonCodes: zodiac?.reasonCodes.filter((c) => c.includes('ELEMENT')) ?? [],
      explanation: 'Element hoàng đạo (FIRE / EARTH / AIR / WATER) của hai cung — khám phá bản chất nguyên tố đang cộng hưởng.',
    }),
    buildModule({
      module: 'ZODIAC_MODALITY',
      label: 'Zodiac Modality Score',
      score: zodiacModalityScore,
      weight: 0.07,
      rawValues: { modalityA: zodiac?.rawValues.modalityA ?? null, modalityB: zodiac?.rawValues.modalityB ?? null },
      reasonCodes: zodiac?.reasonCodes.filter((c) => c.includes('MODALITY')) ?? [],
      explanation: 'Modality (CARDINAL / FIXED / MUTABLE) — nhịp sống hai cung đang chạy cùng tốc độ hay đối nghịch.',
    }),
    buildModule({
      module: 'CHINESE_ZODIAC',
      label: 'Chinese Zodiac Score',
      score: chineseZodiacScore,
      weight: 0.10,
      rawValues: {
        animalA: chinese?.animalA?.vi ?? null,
        animalB: chinese?.animalB?.vi ?? null,
        relationshipType: chinese?.relationshipType ?? null,
      },
      reasonCodes: chinese?.reasonCodes ?? [],
      explanation: chinese?.explanation ?? 'Chưa có dữ liệu con giáp để phân tích.',
    }),
    buildModule({
      module: 'FIVE_ELEMENT',
      label: 'Five Element Score',
      score: fiveElementScore,
      weight: 0.08,
      rawValues: { elementA, elementB, relationType: fiveElementResult?.relationType ?? null },
      reasonCodes: fiveElementResult?.reasonCodes ?? [],
      explanation: fiveElementResult?.explanation ?? 'Chưa có dữ liệu ngũ hành để phân tích.',
    }),
    buildModule({
      module: 'PERSONAL_YEAR_TIMING',
      label: 'Personal Year Timing',
      score: timingScore,
      weight: 0.05,
      rawValues: { a: yearA?.number ?? null, b: yearB?.number ?? null, currentYear },
      reasonCodes: [],
      explanation: `Năm cá nhân ${currentYear} của hai bạn — chủ đề tình yêu trong 12 tháng tới đang cùng nhịp hay lệch pha.`,
    }),
  ];

  const levelLabel = getLevelLabel(totalScore);

  const displayNames = {
    personA: getDisplayName(input.personA.name, input.privacyMode),
    personB: getDisplayName(input.personB.name, input.privacyMode),
    pair: safeDisplayPair(input.personA.name, input.personB.name, input.privacyMode),
  };
  const initials = {
    personA: getInitial(input.personA.name),
    personB: getInitial(input.personB.name),
  };

  const inputHash = computeInputHash(input, 'NAME_DOB');

  const explanation = buildLoveExplanation(
    buildExplanationContext({
      input,
      result: {
        readingType: 'NAME_DOB',
        totalScore,
        levelLabel,
        subscores,
        modules,
        reasonCodes: collectReasonCodes(modules),
        summary: '',
        trustExplanation: '',
        calculationBreakdown: [],
        personalizedInsights: [],
        strengths: [],
        risks: [],
        advice: [],
        adHints: AD_HINTS,
        inputHash,
        displayNames,
        initials,
      },
      dbData,
      currentYear,
    }),
  );

  return {
    readingType: 'NAME_DOB',
    totalScore,
    levelLabel,
    subscores,
    modules,
    reasonCodes: collectReasonCodes(modules),
    summary: explanation.summary,
    trustExplanation: explanation.trustExplanation,
    calculationBreakdown: explanation.calculationBreakdown,
    personalizedInsights: explanation.personalizedInsights,
    strengths: explanation.strengths,
    risks: explanation.risks,
    advice: explanation.advice,
    adHints: explanation.adHints,
    inputHash,
    displayNames,
    initials,
  };
}

// =============================================================================
// Module builders for semantic / name element
// =============================================================================

interface SemanticModuleResult {
  score: number;
  hasDb: boolean;
  module: ModuleResult;
}

function buildSemanticModule(
  nameA: NameSemanticsData | undefined,
  nameB: NameSemanticsData | undefined,
): SemanticModuleResult {
  if (nameA && nameB) {
    const r = scoreNameSemanticMatch(nameA, nameB);
    return {
      score: r.score,
      hasDb: true,
      module: buildModule({
        module: 'NAME_SEMANTIC',
        label: 'Name Semantic Match',
        score: r.score,
        weight: 0.10,
        rawValues: {
          nameATags: r.rawValues.nameATags,
          nameBTags: r.rawValues.nameBTags,
          commonTags: r.rawValues.commonTags,
          elementA: r.rawValues.elementA,
          elementB: r.rawValues.elementB,
          appliedRules: r.rawValues.appliedRules,
        },
        reasonCodes: r.reasonCodes,
        explanation: r.explanation,
      }),
    };
  }
  return {
    score: DEFAULT_NEUTRAL_SCORE,
    hasDb: false,
    module: buildModule({
      module: 'NAME_SEMANTIC',
      label: 'Name Semantic Match',
      score: DEFAULT_NEUTRAL_SCORE,
      weight: 0.10,
      rawValues: { available: false },
      reasonCodes: [],
        explanation: 'Chưa có dữ liệu ý nghĩa tên trong cơ sở dữ liệu — tạm dùng điểm trung tính 70/100. Khi bổ sung xong, điểm sẽ chính xác hơn.',
    }),
  };
}

interface NameElementModuleResult {
  score: number;
  hasDb: boolean;
  module: ModuleResult;
}

function buildNameElementModule(
  nameA: NameSemanticsData | undefined,
  nameB: NameSemanticsData | undefined,
): NameElementModuleResult {
  if (nameA && nameB) {
    const r = scoreElementPair(nameA.symbolicElement, nameB.symbolicElement);
    return {
      score: r.score,
      hasDb: true,
      module: buildModule({
        module: 'NAME_ELEMENT',
        label: 'Name Element Match',
        score: r.score,
        weight: 0.05,
        rawValues: {
          elementA: nameA.symbolicElement,
          elementB: nameB.symbolicElement,
          relationType: r.relationType,
        },
        reasonCodes: r.reasonCodes,
        explanation: r.explanation,
      }),
    };
  }
  return {
    score: DEFAULT_NEUTRAL_SCORE,
    hasDb: false,
    module: buildModule({
      module: 'NAME_ELEMENT',
      label: 'Name Element Match',
      score: DEFAULT_NEUTRAL_SCORE,
      weight: 0.05,
      rawValues: { available: false },
      reasonCodes: [],
        explanation: 'Chưa có dữ liệu ngũ hành tên — tạm dùng điểm trung tính 70/100.',
    }),
  };
}

// =============================================================================
// Helper: score if both numerology results exist
// =============================================================================

function scoreIfBoth<T extends { number: number }>(
  a: T | null,
  b: T | null,
  fn: (a: number, b: number) => number,
): number {
  if (!a || !b) return DEFAULT_NEUTRAL_SCORE;
  return fn(a.number, b.number);
}
