"use client";

import { useEffect, useRef } from "react";
import { trackSponsoredChallengeViewed } from "@/lib/campaigns/campaign-tracking";

type SponsoredChallengeTrackerProps = {
  campaignId: string;
  sponsorId: string | null;
  challengeId: string;
};

export function SponsoredChallengeTracker({
  campaignId,
  sponsorId,
  challengeId
}: SponsoredChallengeTrackerProps) {
  const trackedViewRef = useRef(false);

  useEffect(() => {
    if (!trackedViewRef.current) {
      trackedViewRef.current = true;
      void trackSponsoredChallengeViewed({ campaignId, sponsorId, challengeId });
    }
  }, [campaignId, challengeId, sponsorId]);

  return null;
}
