import type { ReelsItem } from "@/lib/reels/getReelsItems";
import type { CampaignWithSponsor } from "@/types/campaign";

export type ReelsFeedEntry =
  | {
      kind: "reel";
      instanceId: string;
      item: ReelsItem;
    }
  | {
      kind: "native_campaign";
      instanceId: string;
      campaign: CampaignWithSponsor;
    }
  | {
      kind: "ad_slot";
      instanceId: string;
      placementKey: string;
    };

export function buildReelsFeedEntries(input: {
  items: ReelsItem[];
  cycle: number;
  seed: number;
  nativeCampaign: CampaignWithSponsor | null;
  nativeFrequency: number;
}): ReelsFeedEntry[] {
  const { items, cycle, seed, nativeCampaign, nativeFrequency } = input;
  const entries: ReelsFeedEntry[] = [];
  let reelCount = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    entries.push({
      kind: "reel",
      instanceId: `${item.id}-${cycle}-${seed + index}`,
      item
    });
    reelCount += 1;

    if (
      nativeCampaign &&
      nativeFrequency > 0 &&
      reelCount % nativeFrequency === 0
    ) {
      entries.push({
        kind: "native_campaign",
        instanceId: `campaign-${nativeCampaign.id}-${cycle}-${seed + index}`,
        campaign: nativeCampaign
      });
    }
  }

  return entries;
}

export function isReelsFeedEntry(item: ReelsFeedEntry | undefined) {
  return item?.kind === "reel";
}
