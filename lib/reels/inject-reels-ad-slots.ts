import type { ReelsFeedEntry } from "@/lib/reels/reels-feed-entries";

const DEFAULT_EVERY_N_REELS = 5;

/**
 * Inserts full-screen ad feed items between reels when admin enables placement.
 * Never overlays text — each ad is its own feed card.
 */
export function injectReelsAdSlots(
  entries: ReelsFeedEntry[],
  options: { enabled: boolean; everyN?: number }
): ReelsFeedEntry[] {
  if (!options.enabled) {
    return entries;
  }

  const everyN = Math.max(3, options.everyN ?? DEFAULT_EVERY_N_REELS);
  const out: ReelsFeedEntry[] = [];
  let reelCount = 0;

  for (const entry of entries) {
    out.push(entry);
    if (entry.kind !== "reel") {
      continue;
    }
    reelCount += 1;
    if (reelCount > 0 && reelCount % everyN === 0) {
      out.push({
        kind: "ad_slot",
        instanceId: `reels-ad-${reelCount}`,
        placementKey: "reels_between_items"
      });
    }
  }

  return out;
}
