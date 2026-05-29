"use client";

import { trackEvent } from "@/lib/analytics/trackEvent";
import type { AnalyticsMetadata } from "@/types/analytics";

type ExperimentTrackingInput = {
  experimentKey: string;
  variant: string;
  pagePath?: string | null;
  extra?: AnalyticsMetadata;
};

export function trackExperimentExposure(input: ExperimentTrackingInput) {
  const pagePath =
    input.pagePath ?? (typeof window !== "undefined" ? window.location.pathname : null);

  void trackEvent({
    eventName: "experiment_exposed",
    metadata: {
      experiment_key: input.experimentKey,
      variant: input.variant,
      page_path: pagePath,
      ...(input.extra ?? {})
    },
    targetType: "page"
  });
}

export function trackExperimentConversion(input: {
  experimentKey: string;
  variant: string;
  conversionName: string;
  properties?: AnalyticsMetadata;
}) {
  const pagePath = typeof window !== "undefined" ? window.location.pathname : null;

  void trackEvent({
    eventName: "experiment_converted",
    metadata: {
      conversion_event: input.conversionName,
      experiment_key: input.experimentKey,
      variant: input.variant,
      page_path: pagePath,
      ...(input.properties ?? {})
    },
    targetType: "page"
  });
}
