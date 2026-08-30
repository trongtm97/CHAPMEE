import type { ReelsFeedCursorPayload } from "@/types/feed-mixer";

export function encodeReelsFeedCursor(payload: ReelsFeedCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeReelsFeedCursor(
  cursor: string | null | undefined
): ReelsFeedCursorPayload | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as ReelsFeedCursorPayload;
    if (parsed.v !== 1 || !parsed.requestId) return null;
    return {
      v: 1,
      requestId: parsed.requestId,
      offset: Math.max(0, parsed.offset ?? 0),
      seenKeys: Array.isArray(parsed.seenKeys) ? parsed.seenKeys.slice(0, 400) : [],
      shuffleSeed:
        typeof parsed.shuffleSeed === "number" && Number.isFinite(parsed.shuffleSeed)
          ? parsed.shuffleSeed >>> 0
          : undefined
    };
  } catch {
    return null;
  }
}

export function candidateKey(candidate: {
  kind?: string;
  itemType: string;
  itemId: string;
}) {
  const kind = candidate.kind ?? candidate.itemType;
  return `${kind}:${candidate.itemId}`;
}
