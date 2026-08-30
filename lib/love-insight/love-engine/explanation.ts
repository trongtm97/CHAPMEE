/**
 * Explanation engine — biến điểm số thành bản báo cáo tình yêu cá nhân hóoá,
 * có lý do, có căn cứ, có giải thích. Pure / deterministic / không random.
 *
 * KHÔNG có: lockedSections, premiumTeasers, upsell, payment CTA.
 * Engine chỉ tạo narrative dựa trên dữ liệu có sẵn trong context.
 */

import type { ReadingType } from '@/lib/love-insight/shared';
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
import { getZodiacSign } from './zodiac';
import { getChineseZodiacAnimal } from './chineseZodiac';
import { getYearElement } from './fiveElements';
import { normalizeName, splitVietnameseName } from './normalize';
import type { NameSemanticsData } from './nameSemantics';
import type {
  DbData,
  LoveInput,
  LoveReadingResult,
  ModuleResult,
  PersonInput,
  PrivacyMode,
  Subscores,
} from './types';

// =============================================================================
// Rich types — output của explanation engine
// =============================================================================

export interface CalculationBreakdownItem {
  label: string;
  score: number;
  weight?: number;
  why: string;
  rawDisplay: string;
}

export interface InsightItem {
  title: string;
  text: string;
  basedOn: string;
}

export interface StrengthItem {
  title: string;
  text: string;
  basedOn: string;
}

export interface RiskItem {
  title: string;
  text: string;
  basedOn: string;
  howToHandle: string;
}

export interface AdviceItem {
  title: string;
  text: string;
  basedOn: string;
}

export interface AdHintWithReason {
  position: 'after_summary' | 'after_subscores' | 'after_insights' | 'bottom';
  enabled: boolean;
  reason: string;
}

export interface LoveExplanation {
  summary: string;
  trustExplanation: string;
  calculationBreakdown: CalculationBreakdownItem[];
  personalizedInsights: InsightItem[];
  strengths: StrengthItem[];
  risks: RiskItem[];
  advice: AdviceItem[];
  adHints: AdHintWithReason[];
}

// =============================================================================
// Per-person data shape (một người)
// =============================================================================

export interface PerPersonData {
  originalName: string;
  normalizedName: string;
  familyName: string | null;
  middleNames: string[];
  givenName: string;
  dob?: string;
  // Numerology (luôn có vì luôn tính từ tên)
  pythagorean: { number: number; rawSum: number };
  soulUrge: { number: number; rawSum: number };
  personality: { number: number; rawSum: number };
  givenNameData: { number: number };
  chaldean: { number: number; rawSum: number };
  // DOB-based (chỉ có khi NAME_DOB + có DOB)
  lifePath?: { number: number; rawSum: number };
  birthday?: { number: number; rawSum: number };
  attitude?: { number: number; rawSum: number };
  personalYear?: { number: number; rawSum: number; currentYear: number };
  zodiac?: { signVi: string; signEn: string; element: string; modality: string; polarity: string };
  chineseZodiac?: { animalVi: string; animalEn: string };
  fiveElement?: { element: string };
  // Semantic (chỉ có khi có dbData)
  semantic?: { meaning: string; loveStyle: string; tags: string[]; symbolicElement: string };
}

export interface ExplanationContext {
  personA: PerPersonData;
  personB: PerPersonData;
  readingType: ReadingType;
  totalScore: number;
  levelLabel: string;
  subscores: Subscores;
  modules: ModuleResult[];
  reasonCodes: string[];
  relationshipStatus?: string;
  privacyMode: PrivacyMode;
}

// =============================================================================
// Helpers
// =============================================================================

function truncate(text: string, max: number): string {
  const t = (text ?? '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

function formatRaw(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.length} mục]`;
  if (typeof v === 'object') return '{…}';
  return String(v);
}

// =============================================================================
// buildExplanationContext — helper tích hợp với scoring engine
// =============================================================================

export function buildExplanationContext(params: {
  input: LoveInput;
  result: LoveReadingResult;
  dbData?: DbData;
  currentYear?: number;
}): ExplanationContext {
  const { input, result, dbData, currentYear } = params;
  return {
    personA: buildPerPersonData({
      input: input.personA,
      readingType: result.readingType,
      semantic: dbData?.nameA,
      currentYear,
    }),
    personB: buildPerPersonData({
      input: input.personB,
      readingType: result.readingType,
      semantic: dbData?.nameB,
      currentYear,
    }),
    readingType: result.readingType,
    totalScore: result.totalScore,
    levelLabel: result.levelLabel,
    subscores: result.subscores,
    modules: result.modules,
    reasonCodes: result.reasonCodes,
    relationshipStatus: input.relationshipStatus,
    privacyMode: input.privacyMode,
  };
}

function buildPerPersonData(params: {
  input: PersonInput;
  readingType: ReadingType;
  semantic?: NameSemanticsData;
  currentYear?: number;
}): PerPersonData {
  const { input, readingType, semantic, currentYear } = params;
  const normalized = normalizeName(input.name);
  const split = splitVietnameseName(input.name);
  const data: PerPersonData = {
    originalName: input.name,
    normalizedName: normalized,
    familyName: split.familyName,
    middleNames: split.middleNames,
    givenName: split.givenName,
    dob: input.dob,
    pythagorean: calculatePythagoreanName(normalized),
    soulUrge: calculateSoulUrge(normalized),
    personality: calculatePersonalityNumber(normalized),
    givenNameData: calculateGivenNameNumber(split.givenName || normalized),
    chaldean: calculateChaldeanName(normalized),
  };

  if (semantic) {
    data.semantic = {
      meaning: semantic.meaning,
      loveStyle: semantic.loveStyle,
      tags: [...semantic.semanticTags],
      symbolicElement: semantic.symbolicElement,
    };
  }

  if (readingType === 'NAME_DOB' && input.dob) {
    data.lifePath = calculateLifePath(input.dob);
    data.birthday = calculateBirthdayNumber(input.dob);
    data.attitude = calculateAttitudeNumber(input.dob);
    if (currentYear) {
      const py = calculatePersonalYear(input.dob, currentYear);
      data.personalYear = { number: py.number, rawSum: py.rawSum, currentYear };
    }
    const zodiacSign = getZodiacSign(input.dob);
    if (zodiacSign) {
      data.zodiac = {
        signVi: zodiacSign.signVi,
        signEn: zodiacSign.signEn,
        element: zodiacSign.element,
        modality: zodiacSign.modality,
        polarity: zodiacSign.polarity,
      };
    }
    const chineseAnimal = getChineseZodiacAnimal(input.dob);
    if (chineseAnimal) {
      data.chineseZodiac = {
        animalVi: chineseAnimal.vi,
        animalEn: chineseAnimal.en,
      };
    }
    const element = getYearElement(input.dob);
    if (element) {
      data.fiveElement = { element };
    }
  }

  return data;
}

// =============================================================================
// buildLoveExplanation — main API
// =============================================================================

export function buildLoveExplanation(context: ExplanationContext): LoveExplanation {
  return {
    summary: buildSummary(context),
    trustExplanation: buildTrustExplanation(context),
    calculationBreakdown: buildCalculationBreakdown(context),
    personalizedInsights: buildPersonalizedInsights(context),
    strengths: buildStrengths(context),
    risks: buildRisks(context),
    advice: buildAdvice(context),
    adHints: buildAdHints(),
  };
}

// =============================================================================
// PHẦN 1 — summary (3-5 câu)
// =============================================================================

const SUBNAME_VI: Record<keyof Omit<Subscores, 'conflictRisk'>, string> = {
  emotional: 'cảm xúc',
  communication: 'giao tiếp',
  chemistry: 'sức hút',
  stability: 'nền tảng',
  longTerm: 'tiềm năng dài hạn',
};

const SUBSHORT_VI: Record<keyof Omit<Subscores, 'conflictRisk'>, string> = {
  emotional: 'sự thấu cảm giữa hai người',
  communication: 'cách hai bạn trò chuyện',
  chemistry: 'sức hút tự nhiên',
  stability: 'nền tảng vững vàng',
  longTerm: 'tiềm năng đi cùng nhau dài hơi',
};

const SUBSHORT_LOW: Record<keyof Omit<Subscores, 'conflictRisk'>, string> = {
  emotional: 'cảm xúc chưa tìm được tiếng nói chung',
  communication: 'cách nói chuyện đôi khi vẫn chưa "khớp"',
  chemistry: 'sức hút còn nhẹ, cần thêm thời gian để nảy nở',
  stability: 'nền tảng còn mỏng, cần xây từ thói quen nhỏ',
  longTerm: 'tầm nhìn tương lai chưa thật sự rõ ràng',
};

function getTopSubscoreKeys(
  sub: Subscores,
  n: number,
): Array<{ key: keyof Omit<Subscores, 'conflictRisk'>; score: number }> {
  const keys = Object.keys(SUBNAME_VI) as Array<keyof Omit<Subscores, 'conflictRisk'>>;
  return keys
    .map((key) => ({ key, score: sub[key] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

function getOverallAdjective(score: number): string {
  if (score >= 85) return 'rất rõ ràng và bền chặt';
  if (score >= 75) return 'khá rõ ràng, đầy hứa hẹn';
  if (score >= 60) return 'có nhiều tiềm năng đáng để khai phá';
  if (score >= 40) return 'còn nhiều khác biệt, cần kiên nhẫn';
  return 'đòi hỏi nhiều nỗ lực từ cả hai phía';
}

function getConflictNote(conflictRisk: number): string {
  if (conflictRisk >= 70) {
    return 'Chỉ số rủi ro xung đột đang ở mức cao — tránh để im lặng kéo dài hay dùng "thử lòng" để kiểm tra tình cảm.';
  }
  if (conflictRisk >= 50) {
    return 'Rủi ro xung đột ở mức vừa — cả hai nên hẹn nhau nói chuyện vào lúc đã thật sự bình tĩnh.';
  }
  return 'Rủi ro xung đột thấp — hai bạn có khả năng hoà giải khá tốt khi xảy ra bất đồng.';
}

function getStatusNote(status: string | undefined): string | null {
  switch (status) {
    case 'CRUSH':
      return 'Đang ở giai đoạn thích nhau, nên quan sát tín hiệu thật từ cả hai phía thay vì chỉ đoán ý nhau.';
    case 'SITUATIONSHIP':
      return 'Trong giai đoạn chưa rõ ràng, điều quan trọng nhất là cùng làm rõ kỳ vọng thay vì để mơ hồ kéo dài.';
    case 'DATING':
      return 'Khi đang hẹn hò, con số này gợi ý nên duy trì giao tiếp cởi mở và tìm hiểu nhu cầu thật của nhau.';
    case 'LONG_DISTANCE':
      return 'Với khoảng cách địa lý, một lịch giao tiếp cố định và những cam kết nhỏ sẽ giữ kết nối ổn định hơn.';
    case 'EX':
      return 'Vì đã từng là một cặp, mọi phân tích hiện tại chỉ mang tính tham khảo — bình tĩnh nhìn lại nguyên nhân cũ trước khi đưa ra bất kỳ quyết định nào.';
    case 'MARRIED':
      return 'Trong đời sống hôn nhân, thói quen nhỏ mỗi ngày và lắng nghe không phán xét thường tạo ra thay đổi lớn hơn những cuộc trò chuyện dài.';
    default:
      return null;
  }
}

function buildSummary(ctx: ExplanationContext): string {
  const { totalScore, levelLabel, subscores, relationshipStatus } = ctx;
  const parts: string[] = [];

  // Câu 1: overall + 1-2 top subscores
  const top = getTopSubscoreKeys(subscores, 2);
  const adj = getOverallAdjective(totalScore);
  if (top.length >= 2 && top[0] && top[1] && top[0].score >= 60) {
    parts.push(
      `Mức kết nối giữa hai bạn đang ${adj}, nổi bật nhất ở ${SUBNAME_VI[top[0].key]} (${top[0].score}) và ${SUBNAME_VI[top[1].key]} (${top[1].score}).`,
    );
  } else if (top.length >= 1 && top[0]) {
    parts.push(
      `Mức kết nối giữa hai bạn đang ${adj}, nổi bật nhất ở ${SUBNAME_VI[top[0].key]} (${top[0].score}).`,
    );
  } else {
    parts.push(`Mức kết nối giữa hai bạn đang ${adj}.`);
  }

  // Câu 2: totalScore + level + advice dựa trên weak subscore
  const weak = getTopSubscoreKeys(subscores, 6).reverse()[0];
  if (weak && weak.score < 60) {
    parts.push(
      `Với ${totalScore}/100 (${levelLabel}), mối quan hệ này có thể phát triển tiếp nếu cả hai chú ý hơn tới ${SUBNAME_VI[weak.key]}.`,
    );
  } else {
    parts.push(
      `Với ${totalScore}/100 (${levelLabel}), mối quan hệ này đang có nền tảng tốt để đi tiếp cùng nhau.`,
    );
  }

  // Câu 3: conflict risk note (luôn có)
  parts.push(getConflictNote(subscores.conflictRisk));

  // Câu 4 (tuỳ chọn): weak subscore
  if (weak && weak.score < 60) {
    parts.push(
      `Khu vực cần chú ý: ${SUBNAME_VI[weak.key]} đang ở mức ${weak.score}/100 — ${SUBSHORT_LOW[weak.key]}.`,
    );
  }

  // Câu 5 (tuỳ chọn): relationship status
  const statusNote = getStatusNote(relationshipStatus);
  if (statusNote) parts.push(statusNote);

  return parts.join(' ');
}

// =============================================================================
// PHẦN 2 — trustExplanation
// =============================================================================

function buildTrustExplanation(ctx: ExplanationContext): string {
  const { readingType, totalScore } = ctx;
  if (readingType === 'NAME_ONLY') {
    return `Con số này không được tạo ngẫu nhiên. Hệ thống đã đọc từng lớp trong tên hai bạn: thần số học Pythagorean, Chaldean, chỉ số linh hồn từ nguyên âm, chỉ số tính cách từ phụ âm, nhịp âm thanh tên, ý nghĩa tên tiếng Việt và ngũ hành biểu tượng của tên. Mỗi lớp cho ra một điểm riêng, rồi được cộng lại theo trọng số cố định để ra điểm tổng ${totalScore}/100. Bạn có thể xem từng lớp phân tích bên dưới để biết con số tổng được hình thành từ đâu.`;
  }
  return `Con số này không được tạo ngẫu nhiên. Ngoài các lớp đọc từ tên, hệ thống còn dùng ngày sinh để tính Life Path, Birthday Number, Attitude Number, cung hoàng đạo, con giáp, ngũ hành và chu kỳ cá nhân trong năm hiện tại — nên bản phân tích này sâu hơn bản chỉ dùng tên. Mỗi lớp cho ra một điểm riêng, rồi được cộng lại theo trọng số cố định để ra điểm tổng ${totalScore}/100. Bạn có thể xem từng lớp phân tích bên dưới để biết con số tổng được hình thành từ đâu.`;
}

// =============================================================================
// PHẦN 3 — calculationBreakdown
// =============================================================================

function buildCalculationBreakdown(ctx: ExplanationContext): CalculationBreakdownItem[] {
  return ctx.modules.map((m) => ({
    label: m.label,
    score: m.score,
    weight: m.weight,
    why: buildModuleWhy(m),
    rawDisplay: buildRawDisplay(m),
  }));
}

function buildModuleWhy(m: ModuleResult): string {
  const tone = m.score >= 80 ? 'đây là điểm mạnh' : m.score >= 60 ? 'mức trung bình khá' : 'điểm cần chú ý';
  return `${m.label} đạt ${m.score}/100 — ${tone}. ${m.explanation}`;
}

function buildRawDisplay(m: ModuleResult): string {
  const entries = Object.entries(m.rawValues);
  if (entries.length === 0) return '';
  return entries
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${formatRaw(v)}`)
    .join(' · ');
}

// =============================================================================
// PHẦN 4 — personalizedInsights (4-8 insight)
// =============================================================================

function buildPersonalizedInsights(ctx: ExplanationContext): InsightItem[] {
  const insights: InsightItem[] = [];
  const { personA, personB, readingType } = ctx;

  // 1. Tên
  insights.push(buildNameInsight(personA, personB, readingType === 'NAME_DOB'));

  // 2. Soul Urge
  insights.push(buildSoulUrgeInsight(personA, personB));

  // 3. Personality
  insights.push(buildPersonalityInsight(personA, personB));

  // 4-7. DOB-based (chỉ thêm nếu có dữ liệu)
  if (readingType === 'NAME_DOB') {
    if (personA.lifePath && personB.lifePath) {
      insights.push(buildLifePathInsight(personA, personB));
    }
    if (personA.zodiac && personB.zodiac) {
      insights.push(buildZodiacInsight(personA, personB));
    }
    if (personA.chineseZodiac && personB.chineseZodiac) {
      insights.push(buildChineseZodiacInsight(personA, personB));
    }
    if (personA.fiveElement && personB.fiveElement) {
      insights.push(buildFiveElementInsight(personA, personB));
    }
  } else {
    // Đảm bảo có insight "thiếu DOB" nếu cần
    // (buildNameInsight đã có sẵn disclaimer nếu readingType = NAME_ONLY)
  }

  return insights;
}

function buildNameInsight(a: PerPersonData, b: PerPersonData, hasDob: boolean): InsightItem {
  if (a.semantic && b.semantic) {
    const snippetA = truncate(a.semantic.loveStyle || a.semantic.meaning, 80);
    const snippetB = truncate(b.semantic.loveStyle || b.semantic.meaning, 80);
    return {
      title: 'Sắc thái hai tên',
      text: `Trong tên ${a.givenName}, hệ thống nhận diện sắc thái "${snippetA}". Trong tên ${b.givenName}, sắc thái đó là "${snippetB}". Đặt cạnh nhau, hai mảng ý nghĩa này gợi cảm giác hai bên tìm thấy sự bổ khuyết tự nhiên — đặc biệt khi cùng trân trọng phần khác biệt.`,
      basedOn: 'Dữ liệu ý nghĩa tên tiếng Việt (VietnameseName)',
    };
  }
  if (hasDob) {
    return {
      title: 'Sắc thái hai tên',
      text: `Hai tên ${a.givenName} và ${b.givenName} mang những rung cảm riêng. Khi kết hợp với dữ liệu ngày sinh, bức tranh tổng thể về hai bạn sẽ rõ nét hơn.`,
      basedOn: 'Tên gốc',
    };
  }
  return {
    title: 'Sắc thái hai tên',
    text: `Vì chưa có ngày sinh, phần này chỉ dựa trên tên và ý nghĩa biểu tượng của tên. Hai tên ${a.givenName} và ${b.givenName} mang những rung cảm riêng — khi có thêm dữ liệu, bản đọc sẽ sâu hơn.`,
    basedOn: 'Tên gốc (thiếu dữ liệu ý nghĩa tên)',
  };
}

function buildSoulUrgeInsight(a: PerPersonData, b: PerPersonData): InsightItem {
  return {
    title: 'Khát vọng bên trong',
    text: `Chỉ số Linh hồn của ${a.givenName} là ${a.soulUrge.number}, còn ${b.givenName} là ${b.soulUrge.number}. Con số này gợi ý rằng mỗi người đang khao khát một điều hơi khác nhau trong tình yêu — cùng nhau tìm điểm chung sẽ tạo nên sự đồng điệu.`,
    basedOn: `Soul Urge Number (${a.soulUrge.number}, ${b.soulUrge.number})`,
  };
}

function buildPersonalityInsight(a: PerPersonData, b: PerPersonData): InsightItem {
  return {
    title: 'Ấn tượng bên ngoài',
    text: `Cách ${a.givenName} thể hiện ra bên ngoài (Personality ${a.personality.number}) có nét tương phản với ${b.givenName} (${b.personality.number}). Hai bạn có thể giúp nhau hoàn thiện ấn tượng đầu tiên với người xung quanh — miễn là đừng vội đánh giá nhau qua vẻ ngoài.`,
    basedOn: `Personality Number (${a.personality.number}, ${b.personality.number})`,
  };
}

function buildLifePathInsight(a: PerPersonData, b: PerPersonData): InsightItem {
  const la = a.lifePath!;
  const lb = b.lifePath!;
  return {
    title: 'Con đường đời',
    text: `Life Path của ${a.givenName} là ${la.number}, của ${b.givenName} là ${lb.number}. Cặp số này gợi mở một con đường chung có thể đi cùng nhau khá xa — nếu cả hai cùng chịu điều chỉnh và tôn trọng hướng đi riêng của nhau.`,
    basedOn: `Life Path Number (${la.number}, ${lb.number})`,
  };
}

function buildZodiacInsight(a: PerPersonData, b: PerPersonData): InsightItem {
  const za = a.zodiac!;
  const zb = b.zodiac!;
  return {
    title: 'Cung hoàng đạo',
    text: `${a.givenName} thuộc ${za.signVi} (${za.signEn}), nhóm ${za.element}; ${b.givenName} thuộc ${zb.signVi} (${zb.signEn}), nhóm ${zb.element}. Hai cung này có nhịp sống riêng — thay vì ép hợp, hãy dành thời gian tìm hiểu sự khác biệt.`,
    basedOn: `Zodiac (${za.signEn}, ${zb.signEn})`,
  };
}

function buildChineseZodiacInsight(a: PerPersonData, b: PerPersonData): InsightItem {
  const ca = a.chineseZodiac!;
  const cb = b.chineseZodiac!;
  return {
    title: 'Con giáp',
    text: `Xét theo con giáp, ${a.givenName} thuộc ${ca.animalVi} và ${b.givenName} thuộc ${cb.animalVi}. Đây là cặp ảnh hưởng đến nhịp 12 năm — thuận hay nghịch phụ thuộc vào việc hai bạn biết tận dụng những năm hợp nhau.`,
    basedOn: `Chinese Zodiac (${ca.animalVi}, ${cb.animalVi})`,
  };
}

function buildFiveElementInsight(a: PerPersonData, b: PerPersonData): InsightItem {
  const fa = a.fiveElement!;
  const fb = b.fiveElement!;
  return {
    title: 'Ngũ hành',
    text: `Ngũ hành của ${a.givenName} là ${fa.element}, của ${b.givenName} là ${fb.element}. Hai nguồn năng lượng này có thể bổ trợ hoặc kìm hãy nhau tuỳ thuộc tương sinh – tương khắc — engine đã tính chi tiết ở mục Five Element.`,
    basedOn: `Five Element (${fa.element}, ${fb.element})`,
  };
}

// =============================================================================
// PHẦN 5 — strengths (3-5 item)
// =============================================================================

function buildStrengths(ctx: ExplanationContext): StrengthItem[] {
  const sorted = [...ctx.modules].sort((a, b) => b.score - a.score);
  return sorted.slice(0, 3).map((m) => ({
    title: m.label,
    text: `${m.label} đạt ${m.score}/100 — ${m.explanation} Đây là chỗ dựa đáng tin để hai bạn tiếp tục phát huy.`,
    basedOn: m.module,
  }));
}

// =============================================================================
// PHẦN 6 — risks (3-5 item)
// =============================================================================

const HOW_TO_HANDLE: Record<string, string> = {
  PYTHAGOREAN_EXPRESSION: 'Cùng nhau nói về những giá trị cốt lõi để tìm tiếng nói chung.',
  SOUL_URGE: 'Chia sẻ những điều thật sự quan trọng với mỗi người.',
  PERSONALITY: 'Đừng vội đánh giá qua vẻ ngoài — hãy tìm hiểu giá trị bên trong.',
  GIVEN_NAME: 'Cho nhau không gian để thể hiện bản sắc riêng.',
  CHALDEAN_NAME: 'Đừng ép cùng nhịp — trân trọng sự khác biệt.',
  NAME_PHONETIC: 'Khi cãi vã, hãy nói chậm lại và chọn từ ngữ cẩn thận hơn.',
  NAME_SEMANTIC: 'Hỏi thẳng về kỳ vọng thay vì đoán ý nhau.',
  NAME_ELEMENT: 'Tìm một hoạt động giúp cân bằng hai nguồn năng lượng.',
  NAME_NUMEROLOGY: 'Cùng chia sẻ quan điểm sống để điều chỉnh cho hợp.',
  LIFE_PATH: 'Tôn trọng hướng đi riêng thay vì ép hợp nhau.',
  BIRTHDAY_NUMBER: 'Ghi nhận cả những khác biệt nhỏ — chúng tạo nên cá tính.',
  ATTITUDE_NUMBER: 'Chia sẻ cách mỗi người phản ứng với thế giới bên ngoài.',
  ZODIAC_ELEMENT: 'Tránh đẩy nhau vào thế đối đầu — cùng tìm điểm chung.',
  ZODIAC_MODALITY: 'Đồng bộ nhịp sống bằng cách cùng lên kế hoạch.',
  CHINESE_ZODIAC: 'Nếu đang xung, hạn chế xung đột vào những giờ cao điểm.',
  FIVE_ELEMENT: 'Chọn cách bổ trợ thay vì cạnh tranh.',
  PERSONAL_YEAR_TIMING: 'Có thể chờ một năm thuận lợi hơn để đưa ra quyết định lớn.',
};

function buildRisks(ctx: ExplanationContext): RiskItem[] {
  const sorted = [...ctx.modules].sort((a, b) => a.score - b.score);
  return sorted.slice(0, 3).map((m) => ({
    title: m.label,
    text: `${m.label} chỉ đạt ${m.score}/100 — ${m.explanation} Đây là điểm cần chú ý nhiều hơn trong thời gian tới.`,
    basedOn: m.module,
    howToHandle: HOW_TO_HANDLE[m.module] ?? 'Cùng lắng nghe và điều chỉnh dần theo thời gian.',
  }));
}

// =============================================================================
// PHẦN 7 — advice (3-5 item theo relationshipStatus)
// =============================================================================

function buildAdvice(ctx: ExplanationContext): AdviceItem[] {
  const items: AdviceItem[] = [];
  const status = ctx.relationshipStatus;

  if (status === 'CRUSH') {
    items.push({
      title: 'Mở lời tự nhiên',
      text: 'Bắt đầu từ những cuộc trò chuyện ngắn, chưa cần bày tỏ. Quan sát xem người ấy có đang hồi đáp tích cực hay không.',
      basedOn: 'CRUSH relationship',
    });
    items.push({
      title: 'Đọc tín hiệu thật',
      text: 'Phân biệt giữa lịch sự và quan tâm thật. Đừng đoán ý — khi cần, cứ hỏi thẳng cho rõ.',
      basedOn: 'CRUSH relationship',
    });
  } else if (status === 'SITUATIONSHIP') {
    items.push({
      title: 'Làm rõ kỳ vọng',
      text: 'Hẹn nhau một buổi trò chuyện thẳng thắn về mong muốn của mỗi bên. Mơ hồ kéo dài sẽ làm tổn thương cả hai.',
      basedOn: 'SITUATIONSHIP relationship',
    });
  } else if (status === 'DATING') {
    items.push({
      title: 'Giữ lửa qua giao tiếp',
      text: 'Đừng để mỗi cuộc trò chuyện chỉ xoay quanh "hôm nay ăn gì". Hỏi cả về giấc mơ, mục tiêu, nỗi sợ — đó mới là chiều sâu.',
      basedOn: 'DATING relationship',
    });
    items.push({
      title: 'Hiểu "ngôn ngữ yêu thương"',
      text: 'Mỗi người có một "ngôn ngữ yêu thương" khác nhau — lời nói, hành động, thời gian hay món quà. Hỏi để biết ngôn ngữ của người ấy.',
      basedOn: 'DATING relationship',
    });
  } else if (status === 'LONG_DISTANCE') {
    items.push({
      title: 'Lịch giao tiếp cố định',
      text: 'Chọn giờ gọi / video cố định mỗi tuần. Sự nhất quán giữ kết nối ổn định hơn là chờ cảm hứng.',
      basedOn: 'LONG_DISTANCE relationship',
    });
    items.push({
      title: 'Xây niềm tin qua hành động nhỏ',
      text: 'Một tin nhắn buổi sáng, một cuộc gọi bất ngờ, vài tấm ảnh cuộc sống hằng ngày — những thứ nhỏ tạo nên sự an tâm lâu dài.',
      basedOn: 'LONG_DISTANCE relationship',
    });
  } else if (status === 'EX') {
    items.push({
      title: 'Bình tĩnh trước',
      text: 'Chưa vội nhắn tin. Hãy nhìn lại nguyên nhân chia tay trước đó một cách thật khách quan — xem đã thật sự được giải quyết chưa.',
      basedOn: 'EX relationship',
    });
  } else if (status === 'MARRIED') {
    items.push({
      title: 'Thói quen nhỏ mỗi ngày',
      text: 'Một cốc cà phê cùng nhau buổi sáng, một tin nhắn lúc trưa, một cái chạm tay trước khi ngủ — những điều nhỏ tạo ra khác biệt lớn.',
      basedOn: 'MARRIED relationship',
    });
    items.push({
      title: 'Lắng nghe không phán xét',
      text: 'Trong hôn nhân, cảm giác được lắng nghe thường quan trọng hơn một lời khuyên đúng đắn. Hãy nghe trước, phản hồi sau.',
      basedOn: 'MARRIED relationship',
    });
  }

  // Bổ sung generic advice từ subscore
  if (ctx.subscores.communication < 60) {
    items.push({
      title: 'Cải thiện giao tiếp',
      text: 'Chỉ số giao tiếp đang thấp. Thử bắt đầu câu nói bằng cảm xúc thay vì chỉ sự kiện — "anh cảm thấy…" thay vì "anh thấy…".',
      basedOn: 'communication subscore',
    });
  }
  if (ctx.subscores.conflictRisk >= 60) {
    items.push({
      title: 'Quy tắc khi cãi vã',
      text: 'Cùng đặt nguyên tắc: không ghi nhớ, không đem chuyện cũ ra, không nói qua tin nhắn khi đang giận. Đợi bình tĩnh rồi gặp nhau nói chuyện.',
      basedOn: 'conflictRisk subscore',
    });
  }

  if (items.length === 0) {
    items.push({
      title: 'Giữ vững nhịp hiện tại',
      text: 'Các chỉ số đang ổn — cứ tiếp tục như hiện tại, chưa cần thay đổi quá nhiều.',
      basedOn: 'overall',
    });
  }

  return items.slice(0, 5);
}

// =============================================================================
// PHẦN 8 — adHints
// =============================================================================

function buildAdHints(): AdHintWithReason[] {
  return [
    {
      position: 'after_summary',
      enabled: true,
      reason: 'Người dùng vừa đọc xong phần tóm tắt chính.',
    },
    {
      position: 'after_subscores',
      enabled: true,
      reason: 'Người dùng vừa xem qua bảng chỉ số.',
    },
    {
      position: 'after_insights',
      enabled: true,
      reason: 'Người dùng vừa đọc xong phần cá nhân hoá.',
    },
    {
      position: 'bottom',
      enabled: true,
      reason: 'Kết thúc báo cáo.',
    },
  ];
}
