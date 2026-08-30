import { ok as apiOk } from "@/lib/love-insight/api/envelope";
import {
  buildResultUrl,
  buildShareUrl,
  getClientIp,
  jsonResponse,
  parseJsonBody,
  rateLimit,
  withErrorHandling
} from "@/lib/love-insight/api/helpers";
import { findReadingByHash, rowToResult, saveLoveReading } from "@/lib/love-insight/db/loveReadings";
import { loadReadingDbData } from "@/lib/love-insight/db/readingData";
import { createInputHash } from "@/lib/love-insight/love-engine/hash";
import { calculateNameOnlyReading } from "@/lib/love-insight/love-engine/scoring";
import type { LoveInput } from "@/lib/love-insight/love-engine/types";
import { parseNameReading, type NameReadingRequest } from "@/lib/love-insight/validators/love";

export const runtime = "nodejs";

const ROUTE = "POST:/api/v1/love/name";
const RATE_LIMIT = { max: 10, windowMs: 60_000 };

export async function POST(req: Request) {
  return withErrorHandling(ROUTE, async () => {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, ROUTE, RATE_LIMIT);
    if (!limit.allowed) {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: "RATE_LIMIT",
            message: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.",
            details: { resetMs: limit.resetMs }
          }
        },
        {
          status: 429,
          headers: { "Retry-After": Math.ceil(limit.resetMs / 1000).toString() }
        }
      );
    }

    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.response;

    const validation = parseNameReading(parsed.data);
    if (!validation.ok) {
      return jsonResponse(
        {
          ok: false,
          error: { code: "INVALID_INPUT", message: validation.error }
        },
        { status: 400 }
      );
    }

    const input = toEngineInput(validation.data);
    const inputHash = createInputHash({
      personA: { name: input.personA.name, dob: input.personA.dob },
      personB: { name: input.personB.name, dob: input.personB.dob },
      relationshipStatus: input.relationshipStatus,
      privacyMode: input.privacyMode,
      readingType: "NAME_ONLY"
    });

    const existing = await findReadingByHash(inputHash);
    if (existing) {
      return jsonResponse(buildSuccessResponse(rowToResult(existing), existing.id, existing.shareId));
    }

    const dbData = await loadReadingDbData(input.personA.name, input.personB.name);
    const result = calculateNameOnlyReading(input, dbData);
    const saved = await saveLoveReading(result, input);
    return jsonResponse(buildSuccessResponse(rowToResult(saved), saved.id, saved.shareId));
  });
}

function toEngineInput(req: NameReadingRequest): LoveInput {
  return {
    personA: { name: req.personA.name },
    personB: { name: req.personB.name },
    relationshipStatus: req.relationshipStatus,
    privacyMode: req.privacyMode
  };
}

function buildSuccessResponse(
  result: ReturnType<typeof rowToResult>,
  readingId: string,
  shareId: string
) {
  return apiOk({
    readingId,
    shareId,
    resultUrl: buildResultUrl(readingId),
    shareUrl: buildShareUrl(shareId),
    result: {
      readingType: result.readingType,
      id: readingId,
      shareId,
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
      adHints: result.adHints,
      inputHash: result.inputHash,
      displayNames: result.displayNames,
      initials: result.initials
    }
  });
}
