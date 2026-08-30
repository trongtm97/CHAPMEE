import { enrichReelsCandidates } from "@/lib/feed/enrich-reels";
import type { DatabaseClient } from "@/lib/db/types";
import type { ReelsItem } from "@/lib/reels/getReelsItems";
import type { FeedCandidate } from "@/types/feed-mixer";

/** Enrich reels page — scan forward in batch when rows fail hydration (RLS / missing row). */
export async function enrichReelsPage(
  db: DatabaseClient,
  batch: FeedCandidate[],
  input: {
    offset: number;
    limit: number;
    requestId: string;
    algorithmVersion: string;
    userId: string | null;
  }
): Promise<{
  items: ReelsItem[];
  consumedCandidates: FeedCandidate[];
  nextScanOffset: number;
}> {
  const items: ReelsItem[] = [];
  const consumedCandidates: FeedCandidate[] = [];
  let scanOffset = input.offset;
  const maxScan = Math.min(batch.length, input.offset + input.limit * 8);

  while (items.length < input.limit && scanOffset < maxScan) {
    const chunkSize = Math.min(input.limit * 2, maxScan - scanOffset);
    const chunk = batch.slice(scanOffset, scanOffset + chunkSize);
    if (chunk.length === 0) {
      break;
    }

    scanOffset += chunk.length;
    consumedCandidates.push(...chunk);

    const enriched = await enrichReelsCandidates(
      db,
      chunk,
      {
        requestId: input.requestId,
        algorithmVersion: input.algorithmVersion,
        rankPositionStart: input.offset + items.length
      },
      input.userId
    );

    for (const item of enriched) {
      if (items.length >= input.limit) {
        break;
      }
      items.push(item);
    }
  }

  return {
    items,
    consumedCandidates,
    nextScanOffset: scanOffset
  };
}
