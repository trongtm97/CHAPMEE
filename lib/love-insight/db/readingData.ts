import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loveVietnameseNames } from "@/lib/db/schema/love-insight";
import { normalizeName } from "@/lib/love-insight/love-engine/normalize";
import type { NameSemanticsData, SymbolicElement } from "@/lib/love-insight/love-engine/nameSemantics";

export interface ReadingDbData {
  nameA?: NameSemanticsData;
  nameB?: NameSemanticsData;
}

export async function loadReadingDbData(nameA: string, nameB: string): Promise<ReadingDbData> {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);

  const [rowA, rowB] = await Promise.all([
    db
      .select()
      .from(loveVietnameseNames)
      .where(eq(loveVietnameseNames.normalizedName, normA))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(loveVietnameseNames)
      .where(eq(loveVietnameseNames.normalizedName, normB))
      .limit(1)
      .then((rows) => rows[0] ?? null)
  ]);

  return {
    nameA: rowA ? toNameSemantics(rowA) : undefined,
    nameB: rowB ? toNameSemantics(rowB) : undefined
  };
}

function toNameSemantics(row: {
  name: string;
  meaning: string;
  semanticTags: unknown;
  symbolicElement: string;
  loveStyle: string;
  strengths: string;
  risks: string;
  advice: string;
}): NameSemanticsData {
  return {
    name: row.name,
    meaning: row.meaning,
    semanticTags: Array.isArray(row.semanticTags) ? (row.semanticTags as string[]) : [],
    symbolicElement: row.symbolicElement as SymbolicElement,
    loveStyle: row.loveStyle,
    strengths: row.strengths,
    risks: row.risks,
    advice: row.advice
  };
}
