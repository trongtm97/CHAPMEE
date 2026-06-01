import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";
import type { TaxonomySourceSurface } from "@/types/taxonomy-analytics";

export type TaxonomyStoryEventInput = {
  storyId: string;
  chapterId?: string | null;
  taxonomyTermIds?: string[];
  mainGenreId?: string | null;
  sourceSurface: TaxonomySourceSurface | string;
  position?: number | null;
  readDuration?: number | null;
  scrollDepth?: number | null;
  revenueCoin?: number | null;
  termId?: string | null;
  termType?: string | null;
  termSlug?: string | null;
  page?: number | null;
  source?: string | null;
};

function baseProperties(input: TaxonomyStoryEventInput) {
  return {
    story_id: input.storyId,
    chapter_id: input.chapterId ?? null,
    taxonomy_term_ids: input.taxonomyTermIds ?? [],
    main_genre_id: input.mainGenreId ?? null,
    source_surface: input.sourceSurface,
    position: input.position ?? null
  };
}

export async function trackTaxonomyPageView(input: {
  termId: string;
  type: string;
  slug: string;
  page?: number;
  source?: string | null;
}) {
  await trackEvent({
    eventName: analyticsEvents.taxonomyPageView,
    targetType: "page",
    targetId: input.termId,
    metadata: {
      term_id: input.termId,
      type: input.type,
      slug: input.slug,
      page: input.page ?? 1,
      source: input.source ?? "direct"
    }
  });
}

export async function trackTaxonomyStoryImpression(input: TaxonomyStoryEventInput) {
  await trackEvent({
    eventName: analyticsEvents.storyImpression,
    targetType: "story",
    targetId: input.storyId,
    metadata: baseProperties(input)
  });
}

export async function trackTaxonomyStoryClick(input: TaxonomyStoryEventInput) {
  await trackEvent({
    eventName: analyticsEvents.storyClick,
    targetType: "story",
    targetId: input.storyId,
    metadata: baseProperties(input)
  });
}

export async function trackTaxonomyChapterStart(input: TaxonomyStoryEventInput) {
  await trackEvent({
    eventName: analyticsEvents.chapterStart,
    targetType: "chapter",
    targetId: input.chapterId ?? input.storyId,
    metadata: baseProperties(input)
  });
}

export async function trackTaxonomyChapterComplete(input: TaxonomyStoryEventInput) {
  await trackEvent({
    eventName: analyticsEvents.chapterComplete,
    targetType: "chapter",
    targetId: input.chapterId ?? input.storyId,
    metadata: {
      ...baseProperties(input),
      read_duration: input.readDuration ?? null,
      scroll_depth: input.scrollDepth ?? null
    }
  });
}

export async function trackTaxonomyStorySave(input: TaxonomyStoryEventInput) {
  await trackEvent({
    eventName: analyticsEvents.storySave,
    targetType: "story",
    targetId: input.storyId,
    metadata: baseProperties(input)
  });
}

export async function trackTaxonomyStoryPurchase(input: TaxonomyStoryEventInput) {
  await trackEvent({
    eventName: analyticsEvents.storyPurchase,
    targetType: "story",
    targetId: input.storyId,
    metadata: {
      ...baseProperties(input),
      revenue_coin: input.revenueCoin ?? null
    }
  });
}

export async function trackReportWrongTag(input: {
  storyId: string;
  taxonomyTermIds?: string[];
  mainGenreId?: string | null;
  termId?: string | null;
}) {
  await trackEvent({
    eventName: analyticsEvents.reportWrongTag,
    targetType: "story",
    targetId: input.storyId,
    metadata: {
      story_id: input.storyId,
      taxonomy_term_ids: input.taxonomyTermIds ?? [],
      main_genre_id: input.mainGenreId ?? null,
      term_id: input.termId ?? null
    }
  });
}

export function buildTaxonomyTrackingMetadata(input: {
  sourceSurface: TaxonomySourceSurface | string;
  termId?: string;
  termType?: string;
  termSlug?: string;
  taxonomyTermIds?: string[];
  mainGenreId?: string | null;
}) {
  return {
    source_surface: input.sourceSurface,
    term_id: input.termId ?? null,
    taxonomy_type: input.termType ?? null,
    taxonomy_slug: input.termSlug ?? null,
    taxonomy_term_ids: input.taxonomyTermIds ?? [],
    main_genre_id: input.mainGenreId ?? null
  };
}
