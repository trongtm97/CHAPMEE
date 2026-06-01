"use client";

import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { useViewportImpression } from "@/hooks/useViewportImpression";
import {
  buildTaxonomyTrackingMetadata,
  trackTaxonomyStoryClick,
  trackTaxonomyStoryImpression
} from "@/lib/analytics/track-taxonomy-events";
import { trackExposure, trackUserAction } from "@/lib/tracking/track-client";
import type { StoryCatalogTrackingContext } from "@/types/story-catalog-tracking";
import type { TaxonomySourceSurface } from "@/types/taxonomy-analytics";
import type { TrackingCandidatePool, TrackingSurface } from "@/types/tracking";

type TrackedStoryLinkProps = {
  href: string;
  className?: string;
  storyId: string;
  authorUserId?: string | null;
  surface: TrackingSurface;
  position?: number;
  candidatePool?: TrackingCandidatePool | string | null;
  requestId?: string | null;
  algorithmVersion?: string | null;
  sectionKey?: string | null;
  trackingContext?: StoryCatalogTrackingContext;
  sourceSurface?: TaxonomySourceSurface;
  children: ReactNode;
};

export function TrackedStoryLink({
  algorithmVersion,
  authorUserId,
  candidatePool,
  children,
  className,
  href,
  position,
  requestId,
  sectionKey,
  storyId,
  surface,
  sourceSurface,
  trackingContext
}: TrackedStoryLinkProps) {
  const impressionKey = `${surface}:story:${storyId}:${position ?? 0}`;
  const resolvedSourceSurface = trackingContext?.sourceSurface ?? sourceSurface ?? null;
  const taxonomyMetadata = trackingContext
    ? buildTaxonomyTrackingMetadata({
        sourceSurface: trackingContext.sourceSurface,
        termId: trackingContext.termId,
        termType: trackingContext.termType,
        termSlug: trackingContext.termSlug,
        mainGenreId: trackingContext.mainGenreId,
        taxonomyTermIds: [trackingContext.termId]
      })
    : resolvedSourceSurface
      ? { source_surface: resolvedSourceSurface }
      : null;

  const fireTaxonomyImpression = () => {
    if (!resolvedSourceSurface) {
      return;
    }
    void trackTaxonomyStoryImpression({
      storyId,
      sourceSurface: resolvedSourceSurface,
      taxonomyTermIds: trackingContext ? [trackingContext.termId] : [],
      mainGenreId: trackingContext?.mainGenreId ?? null,
      position: position ?? null
    });
  };

  const fireTaxonomyClick = () => {
    if (!resolvedSourceSurface) {
      return;
    }
    void trackTaxonomyStoryClick({
      storyId,
      sourceSurface: resolvedSourceSurface,
      taxonomyTermIds: trackingContext ? [trackingContext.termId] : [],
      mainGenreId: trackingContext?.mainGenreId ?? null,
      position: position ?? null
    });
  };

  const ref = useViewportImpression({
    impressionKey,
    onImpression: () => {
      void trackExposure({
        surface,
        itemType: "story",
        itemId: storyId,
        storyId,
        authorUserId: authorUserId ?? null,
        position: position ?? null,
        candidatePool: candidatePool ?? null,
        requestId: requestId ?? null,
        algorithmVersion: algorithmVersion ?? null
      });
      void trackUserAction({
        surface,
        actionType: "impression",
        itemType: "story",
        itemId: storyId,
        storyId,
        authorUserId: authorUserId ?? null,
        algorithmVersion: algorithmVersion ?? null,
        metadata: {
          position: position ?? null,
          candidate_pool: candidatePool ?? null,
          request_id: requestId ?? null,
          section: sectionKey ?? null,
          ...taxonomyMetadata
        }
      });
      fireTaxonomyImpression();
    }
  });

  return (
    <Link
      className={className}
      href={href}
      onClick={() => {
        void trackUserAction({
          surface,
          actionType: "click",
          itemType: "story",
          itemId: storyId,
          storyId,
          authorUserId: authorUserId ?? null,
          algorithmVersion: algorithmVersion ?? null,
          metadata: {
            position: position ?? null,
            candidate_pool: candidatePool ?? null,
            request_id: requestId ?? null,
            section: sectionKey ?? null,
            ...taxonomyMetadata
          }
        });
        fireTaxonomyClick();
      }}
      ref={ref as Ref<HTMLAnchorElement>}
    >
      {children}
    </Link>
  );
}
