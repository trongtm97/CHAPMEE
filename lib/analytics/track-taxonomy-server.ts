"use server";

import { analyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { trackServerUserAction } from "@/lib/tracking/track-server";
import {
  getStoryTaxonomyTrackingContext,
  type StoryTaxonomyTrackingContext
} from "@/lib/taxonomy-analytics/story-tracking-context";
import type { TaxonomySourceSurface } from "@/types/taxonomy-analytics";

type BaseTaxonomyServerEvent = {
  storyId: string;
  chapterId?: string | null;
  sourceSurface?: TaxonomySourceSurface | string;
  revenueCoin?: number | null;
  readDuration?: number | null;
  scrollDepth?: number | null;
  taxonomyContext?: StoryTaxonomyTrackingContext;
};

async function resolveContext(storyId: string, taxonomyContext?: StoryTaxonomyTrackingContext) {
  return taxonomyContext ?? getStoryTaxonomyTrackingContext(storyId);
}

function buildProperties(
  context: StoryTaxonomyTrackingContext,
  input: BaseTaxonomyServerEvent
) {
  return {
    story_id: input.storyId,
    chapter_id: input.chapterId ?? null,
    taxonomy_term_ids: context.taxonomyTermIds,
    main_genre_id: context.mainGenreId,
    source_surface: input.sourceSurface ?? "catalog",
    read_duration: input.readDuration ?? null,
    scroll_depth: input.scrollDepth ?? null,
    revenue_coin: input.revenueCoin ?? null
  };
}

export async function trackTaxonomyStorySaveServer(input: {
  storyId: string;
  sourceSurface?: TaxonomySourceSurface | string;
}) {
  const context = await getStoryTaxonomyTrackingContext(input.storyId);
  await trackServerEvent({
    eventName: analyticsEvents.storySave,
    targetType: "story",
    targetId: input.storyId,
    metadata: buildProperties(context, {
      storyId: input.storyId,
      sourceSurface: input.sourceSurface ?? "story_detail"
    })
  });
}

export async function trackTaxonomyStoryPurchaseServer(input: {
  storyId: string;
  chapterId: string;
  revenueCoin: number;
  userId: string;
  sourceSurface?: TaxonomySourceSurface | string;
}) {
  const context = await getStoryTaxonomyTrackingContext(input.storyId);
  const metadata = buildProperties(context, {
    storyId: input.storyId,
    chapterId: input.chapterId,
    sourceSurface: input.sourceSurface ?? "catalog",
    revenueCoin: input.revenueCoin
  });

  await trackServerEvent({
    eventName: analyticsEvents.storyPurchase,
    targetType: "story",
    targetId: input.storyId,
    metadata
  });

  await trackServerUserAction(input.userId, {
    surface: "chapter_detail",
    actionType: "unlock_paid",
    itemType: "story",
    itemId: input.storyId,
    storyId: input.storyId,
    chapterId: input.chapterId,
    valueNumeric: input.revenueCoin,
    metadata: {
      source_surface: input.sourceSurface ?? "catalog",
      taxonomy_term_ids: context.taxonomyTermIds,
      main_genre_id: context.mainGenreId
    }
  });
}

export async function trackTaxonomyReportServer(input: {
  storyId: string;
  reasonCode: "wrong_taxonomy_tag" | "missing_content_warning";
  termId?: string | null;
}) {
  const context = await getStoryTaxonomyTrackingContext(input.storyId);
  const eventName =
    input.reasonCode === "wrong_taxonomy_tag"
      ? analyticsEvents.reportWrongTag
      : analyticsEvents.reportMissingWarning;

  await trackServerEvent({
    eventName,
    targetType: "story",
    targetId: input.storyId,
    metadata: {
      story_id: input.storyId,
      taxonomy_term_ids: context.taxonomyTermIds,
      main_genre_id: context.mainGenreId,
      term_id: input.termId ?? null,
      reason_code: input.reasonCode
    }
  });
}

export async function trackTaxonomyChapterStartServer(input: BaseTaxonomyServerEvent) {
  const context = await resolveContext(input.storyId, input.taxonomyContext);
  await trackServerEvent({
    eventName: analyticsEvents.chapterStart,
    targetType: "chapter",
    targetId: input.chapterId ?? input.storyId,
    metadata: buildProperties(context, input)
  });
}

export async function trackTaxonomyChapterCompleteServer(input: BaseTaxonomyServerEvent) {
  const context = await resolveContext(input.storyId, input.taxonomyContext);
  await trackServerEvent({
    eventName: analyticsEvents.chapterComplete,
    targetType: "chapter",
    targetId: input.chapterId ?? input.storyId,
    metadata: buildProperties(context, {
      ...input,
      readDuration: input.readDuration ?? null,
      scrollDepth: input.scrollDepth ?? 100
    })
  });
}
