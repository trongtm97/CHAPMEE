import { SponsoredNativeCard } from "@/components/campaigns/SponsoredNativeCard";
import { AD_SLOT_SURFACE_CLASS } from "@/components/ads/ad-slot-styles";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";
import { ReelsFeedItem } from "@/components/reels/ReelsFeedItem";
import type { ReelsFeedEntry } from "@/lib/reels/reels-feed-entries";

export function ReelsFeedEntryRenderer({ entry }: { entry: ReelsFeedEntry }) {
  if (entry.kind === "native_campaign") {
    return <SponsoredNativeCard campaign={entry.campaign} />;
  }

  if (entry.kind === "ad_slot") {
    return (
      <div className="flex h-full min-h-[50dvh] w-full items-center justify-center bg-[#06090d] px-6 py-10">
        <div className="w-full max-w-md">
          <ChapMeeAdSlot className={AD_SLOT_SURFACE_CLASS} placementKey={entry.placementKey} />
        </div>
      </div>
    );
  }

  return <ReelsFeedItem item={entry.item} />;
}
