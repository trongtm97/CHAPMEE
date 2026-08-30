import { applyExposureCaps } from "@/lib/fairness/apply-exposure-caps";

import { ensureMinimumDiscoveryQuota } from "@/lib/fairness/discovery-quota";

import { enforceFeedDiversity } from "@/lib/fairness/diversity";

import { loadExposure7dContext, emptyExposure7dContext } from "@/lib/fairness/load-exposure-7d";

import { loadFairnessAlertThresholds } from "@/lib/fairness/thresholds";

import { getFairDistributionConfig } from "@/lib/fair-distribution/settings";

import {

  applyAuthorCaps,

  applyTaxonomyFairness

} from "@/lib/fair-distribution/rank-candidates";

import {

  applyQualityPenalties,

  loadQualityContextForCandidates

} from "@/lib/fair-distribution/quality-penalties";

import { loadTaxonomyExposureShare } from "@/lib/fair-distribution/load-taxonomy-context";

import { createAdminClient } from "@/lib/data/admin";

import type { CandidatePools, FeedCandidate, FeedSurface } from "@/types/feed-mixer";

import type { DatabaseClient } from "@/lib/db/types";

import type { RerankRules } from "@/lib/feed/rerank";



async function resolveExposureContext(

  db: DatabaseClient,

  surface: FeedSurface

) {

  try {

    const admin = createAdminClient();

    return await loadExposure7dContext(admin, surface);

  } catch {

    try {

      return await loadExposure7dContext(db, surface);

    } catch {

      return emptyExposure7dContext();

    }

  }

}



export async function applyFairnessGuardPipeline(

  db: DatabaseClient,

  input: {

    surface: FeedSurface;

    items: FeedCandidate[];

    pools: CandidatePools;

    limit: number;

    requestId?: string;

    rerankRules?: RerankRules;

  }

): Promise<FeedCandidate[]> {

  const [exposure, fdsConfig, taxonomyShare] = await Promise.all([

    resolveExposureContext(db, input.surface),

    getFairDistributionConfig(),

    loadTaxonomyExposureShare(db, input.surface, 7)

  ]);



  const logClient = (() => {

    try {

      return createAdminClient();

    } catch {

      return db;

    }

  })();



  const { flags, qualityStatuses } = await loadQualityContextForCandidates(

    db,

    input.items

  );



  const qualityFiltered = applyQualityPenalties(

    input.items,

    fdsConfig,

    flags,

    qualityStatuses

  );



  const withQuota = await ensureMinimumDiscoveryQuota(

    qualityFiltered,

    input.pools,

    input.surface,

    Math.max(input.limit * 2, input.limit + 20)

  );



  const capped = await applyExposureCaps(withQuota, input.surface, exposure, {

    db: logClient,

    requestId: input.requestId

  });



  const taxonomyAdjusted = applyTaxonomyFairness(capped, taxonomyShare, fdsConfig);

  const authorCapped = applyAuthorCaps(

    taxonomyAdjusted,

    fdsConfig.caps.maxItemsPerAuthorPerPage

  );



  const thresholds = await loadFairnessAlertThresholds();



  return enforceFeedDiversity(authorCapped, {

    maxAuthorSharePerFeedPercent:

      fdsConfig.caps.maxAuthorSharePerFeedPercent ||

      thresholds.maxAuthorSharePerFeedPercent,

    maxMainGenreSharePercent: fdsConfig.caps.maxMainGenreSharePercentInFeed,

    minPresentationModeSharePercent:
      fdsConfig.quality.presentationModeMinSharePercent,

    rerankRules: input.rerankRules,

    targetLength: Math.max(input.limit * 2, input.limit + 20)

  });

}

