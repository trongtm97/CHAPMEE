"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/data/client";
import {
  getExperimentVariant,
  getOrCreateAnonymousExperimentId,
  getStoredExperimentVariant,
  storeExperimentVariant
} from "@/lib/experiments/assignment";
import { getExperimentDefinition } from "@/lib/experiments/experiments";
import { trackExperimentExposure } from "@/lib/experiments/tracking";

type UseExperimentOptions = {
  autoTrackExposure?: boolean;
};

export function useExperiment(
  experimentKey: string,
  options: UseExperimentOptions = {}
) {
  const autoTrackExposure = options.autoTrackExposure ?? true;
  const definition = getExperimentDefinition(experimentKey);
  const trackedExposureRef = useRef(false);
  const [subjectId, setSubjectId] = useState<string | null>(() => {
    return getOrCreateAnonymousExperimentId();
  });

  const variantResult = useMemo(() => {
    const rememberedVariant = getStoredExperimentVariant(experimentKey);
    const assigned = getExperimentVariant(experimentKey, subjectId);

    if (!definition || !rememberedVariant) {
      return assigned;
    }

    const rememberedDefinition = definition.variants.find(
      (item) => item.key === rememberedVariant
    );

    if (!rememberedDefinition) {
      return assigned;
    }

    return {
      ...assigned,
      variant: rememberedDefinition.key,
      payload: rememberedDefinition.payload ?? {},
      isDefault: rememberedDefinition.key === definition.default_variant
    };
  }, [definition, experimentKey, subjectId]);

  useEffect(() => {
    storeExperimentVariant(experimentKey, variantResult.variant);
  }, [experimentKey, variantResult.variant]);

  useEffect(() => {
    let isMounted = true;
    const db = createClient();

    void db.auth.getUser().then(({ data }) => {
      if (!isMounted || !data.user?.id) {
        return;
      }
      setSubjectId((previous) => previous ?? data.user?.id ?? null);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const trackExposure = useCallback(() => {
    trackExperimentExposure({
      experimentKey,
      variant: variantResult.variant
    });
  }, [experimentKey, variantResult.variant]);

  useEffect(() => {
    if (!autoTrackExposure || trackedExposureRef.current) {
      return;
    }
    trackedExposureRef.current = true;
    trackExposure();
  }, [autoTrackExposure, trackExposure]);

  return {
    variant: variantResult.variant,
    payload: variantResult.payload,
    isDefault: variantResult.isDefault,
    trackExposure
  };
}
