import "server-only";

import { createClient } from "@/lib/data/server";
import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import {
  buildTaxonomyFilterGroups,
  filterPublicStoryIdsByTaxonomyGroups
} from "@/lib/taxonomy/catalog-filter-rpc";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import { mediaParamsToCatalogFilters } from "@/lib/media/media-catalog-filter-bridge";
import type { MediaHubParams } from "@/lib/media/media-query-params";
import type { DatabaseClient } from "@/lib/db/types";

const PUBLIC_STATUSES = [...publicContentStatuses];

type MediaTaxonomyInput = Pick<
  MediaHubParams,
  | "genre"
  | "subgenre"
  | "tag"
  | "character"
  | "relationship"
  | "narrativeStyle"
  | "setting"
  | "mood"
  | "format"
  | "contentType"
  | "ageRating"
  | "contentWarning"
  | "storyStatus"
>;

async function filterByPresentationMode(
  db: DatabaseClient,
  ids: Set<string>,
  modeSlug: string
) {
  if (ids.size === 0) return ids;
  const { data } = await db
    .from("story_presentation_settings")
    .select("story_id")
    .in("story_id", [...ids])
    .eq("mode", modeSlug.trim());

  const allowed = new Set((data ?? []).map((row) => String(row.story_id)));
  return new Set([...ids].filter((id) => allowed.has(id)));
}

function toCatalogTaxonomyParams(params: MediaTaxonomyInput): StoryCatalogFilterParams {
  const catalog = mediaParamsToCatalogFilters({
    ...params,
    tab: "audio",
    page: 1,
    pageSize: 12,
    q: "",
    sort: "new",
    audioSource: "all",
    videoFilter: "all"
  });
  return catalog;
}

/**
 * Story IDs matching media advanced taxonomy filters (aligned with /truyen).
 * Returns null when no taxonomy filter is active; [] when filters match nothing.
 */
export async function resolveMediaTaxonomyStoryIds(
  params: MediaTaxonomyInput
): Promise<string[] | null> {
  const catalogParams = toCatalogTaxonomyParams(params);
  const groups = buildTaxonomyFilterGroups(catalogParams);
  const formatSlug = params.format?.trim();
  const hasFormat = Boolean(formatSlug);

  if (groups.length === 0 && !hasFormat) {
    return null;
  }

  const db = await createClient();
  let matching: Set<string> | null = null;

  if (groups.length > 0) {
    const ids = await filterPublicStoryIdsByTaxonomyGroups(db, groups);
    matching = new Set(ids);
    if (matching.size === 0) {
      return [];
    }
  }

  if (hasFormat && formatSlug) {
    if (!matching) {
      const { data } = await db
        .from("story_presentation_settings")
        .select("story_id, stories!inner(id)")
        .eq("mode", formatSlug)
        .eq("stories.visibility", "public")
        .in("stories.status", PUBLIC_STATUSES)
        .neq("stories.quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
        .limit(5000);
      matching = new Set((data ?? []).map((row) => String(row.story_id)));
    } else {
      matching = await filterByPresentationMode(db, matching, formatSlug);
    }
    if (matching.size === 0) {
      return [];
    }
  }

  return matching ? [...matching] : null;
}

/** Intersect optional story-id allowlists; null means "no constraint" for that input. */
export function intersectMediaStoryIdFilters(
  ...lists: Array<string[] | null | undefined>
): string[] | null {
  const active = lists.filter((list): list is string[] => list != null);
  if (active.length === 0) {
    return null;
  }
  if (active.some((list) => list.length === 0)) {
    return [];
  }
  let result = new Set(active[0]);
  for (let i = 1; i < active.length; i += 1) {
    const next = new Set(active[i]);
    result = new Set([...result].filter((id) => next.has(id)));
  }
  return [...result];
}
