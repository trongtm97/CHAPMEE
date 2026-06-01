"use client";

import { useEffect, useRef } from "react";
import { trackTaxonomyPageView } from "@/lib/analytics/track-taxonomy-events";

type TaxonomyPageViewTrackerProps = {
  termId: string;
  type: string;
  slug: string;
  page?: number;
  source?: string | null;
};

export function TaxonomyPageViewTracker({
  termId,
  type,
  slug,
  page = 1,
  source = null
}: TaxonomyPageViewTrackerProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }
    sentRef.current = true;
    void trackTaxonomyPageView({ termId, type, slug, page, source });
  }, [termId, type, slug, page, source]);

  return null;
}
