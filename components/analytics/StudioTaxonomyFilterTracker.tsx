"use client";

import { useEffect, useRef } from "react";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";

type StudioTaxonomyFilterTrackerProps = {
  mainGenreTerm?: string;
  contentType?: string;
  presentationMode?: string;
  hasWarning?: string;
  search?: string;
};

function hasActiveFilters(props: StudioTaxonomyFilterTrackerProps) {
  return Boolean(
    props.mainGenreTerm ||
      props.contentType ||
      props.presentationMode ||
      props.hasWarning ||
      props.search?.trim()
  );
}

function buildSelectedTerms(props: StudioTaxonomyFilterTrackerProps) {
  const selected: Array<{ type: string; slug: string }> = [];
  if (props.mainGenreTerm) {
    selected.push({ type: "main_genre", slug: props.mainGenreTerm });
  }
  if (props.contentType) {
    selected.push({ type: "content_type", slug: props.contentType });
  }
  if (props.presentationMode) {
    selected.push({ type: "presentation_mode", slug: props.presentationMode });
  }
  if (props.hasWarning === "yes") {
    selected.push({ type: "content_warning", slug: "any" });
  }
  return selected;
}

export function StudioTaxonomyFilterTracker(props: StudioTaxonomyFilterTrackerProps) {
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasActiveFilters(props)) {
      return;
    }

    const selectedTerms = buildSelectedTerms(props);
    const key = JSON.stringify({ ...props, selectedTerms });
    if (lastKeyRef.current === key) {
      return;
    }
    lastKeyRef.current = key;

    void trackEvent({
      eventName: analyticsEvents.taxonomyFilterApply,
      targetType: "page",
      metadata: {
        selected_terms: selectedTerms,
        source_page: "studio",
        query: props.search?.trim() || null,
        term_ids: []
      }
    });
  }, [props]);

  return null;
}
