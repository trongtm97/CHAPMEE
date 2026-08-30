import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loveReadings, type LoveReadingRow } from "@/lib/db/schema/love-insight";
import type {
  AdviceItem,
  AdHintWithReason,
  CalculationBreakdownItem,
  InsightItem,
  RiskItem,
  StrengthItem
} from "@/lib/love-insight/love-engine/explanation";
import { createShareId } from "@/lib/love-insight/love-engine/hash";
import { getInitial } from "@/lib/love-insight/love-engine/normalize";
import type {
  LoveInput,
  LoveReadingResult,
  ModuleResult,
  PrivacyMode,
  Subscores
} from "@/lib/love-insight/love-engine/types";

export interface PublicShareReading {
  shareId: string;
  totalScore: number;
  levelLabel: string;
  summary: string;
  displayPair: string;
  privacyMode: PrivacyMode;
  topSubscores: Array<{ key: string; label: string; score: number }>;
  featuredSubscores: FeaturedSubscore[];
  createdAt: Date;
}

export interface FeaturedSubscore {
  key: "emotional" | "chemistry" | "longTerm";
  label: string;
  score: number;
}

const SUBSCORE_LABELS: Record<keyof Subscores, string> = {
  emotional: "Cảm xúc",
  communication: "Giao tiếp",
  chemistry: "Sức hút",
  stability: "Nền tảng",
  conflictRisk: "Xung đột",
  longTerm: "Dài hạn"
};

const FEATURED_LABELS: Record<FeaturedSubscore["key"], string> = {
  emotional: "Cảm xúc",
  chemistry: "Sức hút",
  longTerm: "Tiềm năng lâu dài"
};

const FEATURED_ORDER: ReadonlyArray<FeaturedSubscore["key"]> = [
  "emotional",
  "chemistry",
  "longTerm"
];

export function createReadingId(): string {
  return `lr_${randomBytes(12).toString("base64url")}`;
}

export function getTopSubscores(
  sub: Subscores,
  n = 3
): Array<{ key: keyof Subscores; label: string; score: number }> {
  return (Object.keys(SUBSCORE_LABELS) as Array<keyof Subscores>)
    .map((key) => ({ key, label: SUBSCORE_LABELS[key], score: sub[key] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

export function getFeaturedSubscores(sub: Subscores): FeaturedSubscore[] {
  return FEATURED_ORDER.map((key) => ({
    key,
    label: FEATURED_LABELS[key],
    score: sub[key]
  }));
}

export function rowToResult(row: LoveReadingRow): LoveReadingResult {
  return {
    readingType: row.readingType,
    totalScore: row.totalScore,
    levelLabel: row.levelLabel,
    subscores: row.subscores as Subscores,
    modules: row.modules as ModuleResult[],
    reasonCodes: row.reasonCodes as string[],
    summary: row.summary,
    trustExplanation: row.trustExplanation,
    calculationBreakdown: row.calculationBreakdown as CalculationBreakdownItem[],
    personalizedInsights: row.personalizedInsights as InsightItem[],
    strengths: row.strengths as StrengthItem[],
    risks: row.risks as RiskItem[],
    advice: row.advice as AdviceItem[],
    adHints: (row.adHints ?? []) as AdHintWithReason[],
    inputHash: row.inputHash,
    displayNames: {
      personA: displayNameFromRow(row, "A"),
      personB: displayNameFromRow(row, "B"),
      pair: displayPairFromRow(row)
    },
    initials: {
      personA: row.personAInitial,
      personB: row.personBInitial
    }
  };
}

export function toPublicShare(row: LoveReadingRow): PublicShareReading {
  const sub = row.subscores as Subscores;
  return {
    shareId: row.shareId,
    totalScore: row.totalScore,
    levelLabel: row.levelLabel,
    summary: row.summary,
    displayPair: displayPairFromRow(row),
    privacyMode: row.privacyMode as PrivacyMode,
    topSubscores: getTopSubscores(sub, 3),
    featuredSubscores: getFeaturedSubscores(sub),
    createdAt: row.createdAt
  };
}

function displayNameFromRow(row: LoveReadingRow, side: "A" | "B"): string {
  const privacy = row.privacyMode as PrivacyMode;
  if (privacy === "HIDDEN") return "Một kết nối bí mật";
  if (privacy === "INITIALS") {
    return side === "A" ? row.personAInitial : row.personBInitial;
  }
  return side === "A" ? row.personAName : row.personBName;
}

function displayPairFromRow(row: LoveReadingRow): string {
  const privacy = row.privacyMode as PrivacyMode;
  if (privacy === "HIDDEN") return "Một kết nối bí mật ❤️";
  if (privacy === "INITIALS") {
    return `${row.personAInitial} ❤️ ${row.personBInitial}`;
  }
  return `${row.personAName} ❤️ ${row.personBName}`;
}

export async function findReadingByHash(inputHash: string): Promise<LoveReadingRow | null> {
  const rows = await db
    .select()
    .from(loveReadings)
    .where(eq(loveReadings.inputHash, inputHash))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveLoveReading(
  result: LoveReadingResult,
  input: LoveInput
): Promise<LoveReadingRow> {
  const shareId = await generateUniqueShareId();
  const now = new Date();

  const rows = await db
    .insert(loveReadings)
    .values({
      id: createReadingId(),
      inputHash: result.inputHash,
      shareId,
      readingType: result.readingType,
      personAName: input.personA.name.trim(),
      personBName: input.personB.name.trim(),
      personAInitial: getInitial(input.personA.name),
      personBInitial: getInitial(input.personB.name),
      personADob: input.personA.dob ? new Date(input.personA.dob) : null,
      personBDob: input.personB.dob ? new Date(input.personB.dob) : null,
      relationshipStatus: input.relationshipStatus ?? null,
      privacyMode: input.privacyMode,
      totalScore: result.totalScore,
      levelLabel: result.levelLabel,
      subscores: result.subscores,
      modules: result.modules,
      reasonCodes: result.reasonCodes,
      summary: result.summary,
      trustExplanation: result.trustExplanation,
      calculationBreakdown: result.calculationBreakdown,
      personalizedInsights: result.personalizedInsights,
      strengths: result.strengths,
      risks: result.risks,
      advice: result.advice,
      adHints: result.adHints ?? [],
      createdAt: now,
      updatedAt: now
    })
    .returning();

  const saved = rows[0];
  if (!saved) {
    throw new Error("Không lưu được kết quả bói tình yêu.");
  }
  return saved;
}

async function generateUniqueShareId(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = createShareId(12);
    const existing = await db
      .select({ id: loveReadings.id })
      .from(loveReadings)
      .where(eq(loveReadings.shareId, candidate))
      .limit(1);
    if (!existing[0]) return candidate;
  }
  return createShareId(16);
}

export async function getLoveReadingById(id: string): Promise<LoveReadingRow | null> {
  const rows = await db.select().from(loveReadings).where(eq(loveReadings.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getLoveReadingByShareId(shareId: string): Promise<LoveReadingRow | null> {
  const rows = await db
    .select()
    .from(loveReadings)
    .where(eq(loveReadings.shareId, shareId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPublicShareReading(shareId: string): Promise<PublicShareReading | null> {
  const row = await getLoveReadingByShareId(shareId);
  if (!row) return null;
  return toPublicShare(row);
}
