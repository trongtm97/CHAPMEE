"use client";

import { useEffect, useRef } from "react";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";

type TaxonomyFilterApplyTrackerProps = {
  filters: StoryCatalogFilterParams;
  sourcePage: "discover" | "truyen" | "taxonomy_page" | "studio" | "search";
  termIds?: string[];
};

function buildSelectedTerms(filters: StoryCatalogFilterParams) {
  const selected: Array<{ type: string; slug: string }> = [];
  const map: Array<[string, string | undefined]> = [
    ["main_genre", filters.genre],
    ["subgenre", filters.subgenre],
    ["trope_tag", filters.tag],
    ["character_tag", filters.character],
    ["relationship_tag", filters.relationship],
    ["narrative_style", filters.narrativeStyle],
    ["setting_tag", filters.setting],
    ["reader_experience", filters.experience],
    ["presentation_mode", filters.presentation],
    ["content_type", filters.contentType],
    ["age_rating", filters.ageRating],
    ["monetization_access", filters.monetization],
    ["content_warning", filters.contentWarning],
    ["story_status", filters.storyStatus]
  ];

  for (const [type, slug] of map) {
    if (slug) {
      selected.push({ type, slug });
    }
  }
  return selected;
}

function hasActiveFilters(filters: StoryCatalogFilterParams) {
  return buildSelectedTerms(filters).length > 0 || Boolean(filters.q?.trim());
}

export function TaxonomyFilterApplyTracker({
  filters,
  sourcePage,
  termIds = []
}: TaxonomyFilterApplyTrackerProps) {
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasActiveFilters(filters)) {
      return;
    }

    const selectedTerms = buildSelectedTerms(filters);
    const key = JSON.stringify({ sourcePage, selectedTerms, q: filters.q ?? "", termIds });
    if (lastKeyRef.current === key) {
      return;
    }
    lastKeyRef.current = key;

    void trackEvent({
      eventName: analyticsEvents.taxonomyFilterApply,
      targetType: "page",
      metadata: {
        selected_terms: selectedTerms,
        source_page: sourcePage,
        query: filters.q ?? null,
        term_ids: termIds,
        page: filters.page ?? 1
      }
    });
  }, [filters, sourcePage, termIds]);

  return null;
}
