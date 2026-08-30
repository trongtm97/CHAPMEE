import { getStoryIdsWithRecentEpisodes } from "@/lib/discovery/catalog-metrics";
import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import {
  buildTaxonomyFilterGroups,
  filterPublicStoryIdsByTaxonomyGroups
} from "@/lib/taxonomy/catalog-filter-rpc";
import { logSlowQuery } from "@/lib/dev/slow-query-log";
import type { StoryCatalogAccessFilter, StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { TaxonomyType } from "@/types/taxonomy";
import type { DatabaseClient } from "@/lib/db/types";

const PUBLIC_STATUSES = [...publicContentStatuses];

type SlugFilter = { type: TaxonomyType; slug: string };

async function getActiveTermId(
  db: DatabaseClient,
  type: TaxonomyType,
  slug: string
) {
  const { data } = await db
    .from("taxonomy_terms")
    .select("id")
    .eq("type", type)
    .eq("slug", slug.trim())
    .eq("is_active", true)
    .eq("is_public", true)
    .eq("use_for_discover", true)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}

async function storyIdsForTerm(
  db: DatabaseClient,
  termId: string,
  type: TaxonomyType,
  limit = 5000
) {
  const { data } = await db
    .from("story_taxonomy_terms")
    .select("story_id, stories!inner(id)")
    .eq("term_id", termId)
    .eq("type", type)
    .eq("stories.visibility", "public")
    .in("stories.status", PUBLIC_STATUSES)
    .neq("stories.quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
    .is("stories.deleted_at", null)
    .limit(limit);

  return [...new Set((data ?? []).map((row) => String(row.story_id)))];
}

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

async function filterByAccess(
  db: DatabaseClient,
  ids: Set<string>,
  access: StoryCatalogAccessFilter
) {
  if (ids.size === 0) return ids;

  const { data: monetization } = await db
    .from("story_monetization_settings")
    .select(
      "story_id, full_access_enabled, free_first_chapters_count, auto_pricing_enabled"
    )
    .in("story_id", [...ids]);

  const { data: paidChapters } = await db
    .from("chapter_monetization_settings")
    .select("chapter_id, episodes!inner(story_id), is_paid, coin_price")
    .in("episodes.story_id", [...ids])
    .eq("is_paid", true);

  const storiesWithPaid = new Set<string>();
  for (const row of paidChapters ?? []) {
    const episode = row.episodes as { story_id: string } | { story_id: string }[];
    const rel = Array.isArray(episode) ? episode[0] : episode;
    if (rel?.story_id) {
      storiesWithPaid.add(String(rel.story_id));
    }
  }

  const settingsByStory = new Map(
    (monetization ?? []).map((row) => [String(row.story_id), row])
  );

  const allowed = new Set<string>();
  for (const storyId of ids) {
    const settings = settingsByStory.get(storyId);
    const hasPaid = storiesWithPaid.has(storyId);
    const freeChapters = Number(settings?.free_first_chapters_count ?? 0);
    const fullAccess = Boolean(settings?.full_access_enabled);

    if (access === "free" && !hasPaid && !fullAccess) {
      allowed.add(storyId);
    } else if (access === "paid" && hasPaid) {
      allowed.add(storyId);
    } else if (access === "free_chapters" && freeChapters > 0) {
      allowed.add(storyId);
    } else if (access === "full_access" && fullAccess) {
      allowed.add(storyId);
    }
  }

  return allowed;
}

function collectSlugFilters(params: StoryCatalogFilterParams): SlugFilter[] {
  const filters: SlugFilter[] = [];
  const append = (type: TaxonomyType, value?: string) => {
    if (!value?.trim()) return;
    for (const slug of value.split(",").map((part) => part.trim()).filter(Boolean)) {
      filters.push({ type, slug });
    }
  };

  append("main_genre", params.genre);
  append("subgenre", params.subgenre);
  append("trope_tag", params.tag);
  append("character_tag", params.character);
  append("relationship_tag", params.relationship);
  append("narrative_style", params.narrativeStyle);
  append("setting_tag", params.setting);
  append("reader_experience", params.experience);
  append("content_type", params.contentType);
  append("age_rating", params.ageRating);
  append("monetization_access", params.monetization);
  append("content_warning", params.contentWarning);
  append("story_status", params.storyStatus);
  return filters;
}

/**
 * Returns null when no taxonomy/monetization pre-filter applies.
 * Returns [] when filters match no stories.
 */
export async function resolvePublicCatalogStoryIds(
  db: DatabaseClient,
  params: StoryCatalogFilterParams
): Promise<string[] | null> {
  const slugFilters = collectSlugFilters(params);
  const hasPresentation = Boolean(params.presentation?.trim());
  const hasAccess = Boolean(params.access);
  const hasWarning = params.hasWarning === "yes" || params.hasWarning === "no";
  const hasNewChapter = params.hasNewChapter === "yes" || params.hasNewChapter === "no";
  const hasAudio = params.hasAudio === "yes" || params.hasAudio === "no";
  const hasVideo = params.hasVideo === "yes" || params.hasVideo === "no";
  const hasContentOrigin =
    params.contentOrigin === "original" || params.contentOrigin === "translation";

  if (
    slugFilters.length === 0 &&
    !hasPresentation &&
    !hasAccess &&
    !hasWarning &&
    !hasNewChapter &&
    !hasAudio &&
    !hasVideo &&
    !hasContentOrigin
  ) {
    return null;
  }

  let matching: Set<string> | null = null;

  const filterGroups = buildTaxonomyFilterGroups(params);
  if (filterGroups.length > 0) {
    const startedAt = Date.now();
    const ids = await filterPublicStoryIdsByTaxonomyGroups(db, filterGroups);
    logSlowQuery("filter_public_story_ids_by_taxonomy_groups", startedAt, {
      groups: filterGroups.length,
      results: ids.length
    });
    matching = new Set(ids);
    if (matching.size === 0) {
      return [];
    }
  }

  if (hasPresentation && params.presentation) {
    if (!matching) {
      const { data } = await db
        .from("story_presentation_settings")
        .select("story_id, stories!inner(id)")
        .eq("mode", params.presentation.trim())
        .eq("stories.visibility", "public")
        .in("stories.status", PUBLIC_STATUSES)
        .limit(5000);
      matching = new Set((data ?? []).map((row) => String(row.story_id)));
    } else {
      matching = await filterByPresentationMode(
        db,
        matching,
        params.presentation
      );
    }
    if (matching.size === 0) return [];
  }

  if (hasWarning) {
    const { data: warningLinks } = await db
      .from("story_taxonomy_terms")
      .select("story_id")
      .eq("type", "content_warning")
      .limit(8000);
    const withWarning = new Set(
      (warningLinks ?? []).map((row) => String(row.story_id))
    );
    if (!matching) {
      const { data: allPublic } = await db
        .from("stories")
        .select("id")
        .eq("visibility", "public")
        .in("status", PUBLIC_STATUSES)
        .limit(5000);
      matching = new Set((allPublic ?? []).map((row) => String(row.id)));
    }
    matching =
      params.hasWarning === "yes"
        ? new Set([...matching].filter((id) => withWarning.has(id)))
        : new Set([...matching].filter((id) => !withWarning.has(id)));
    if (matching.size === 0) return [];
  }

  if (hasNewChapter) {
    const recentIds = await getStoryIdsWithRecentEpisodes(
      db,
      14,
      matching ? [...matching] : null
    );
    if (!matching) {
      matching = new Set(recentIds);
    } else if (params.hasNewChapter === "yes") {
      const recentSet = new Set(recentIds);
      matching = new Set([...matching].filter((id) => recentSet.has(id)));
    } else {
      const recentSet = new Set(recentIds);
      matching = new Set([...matching].filter((id) => !recentSet.has(id)));
    }
    if (matching.size === 0) return [];
  }

  if (hasAccess && params.access) {
    if (!matching) {
      const { data: allPublic } = await db
        .from("stories")
        .select("id")
        .eq("visibility", "public")
        .in("status", PUBLIC_STATUSES)
        .limit(5000);
      matching = new Set((allPublic ?? []).map((row) => String(row.id)));
    }
    matching = await filterByAccess(db, matching, params.access);
    if (matching.size === 0) return [];
  }

  if (hasContentOrigin) {
    if (!matching) {
      const { data: allPublic } = await db
        .from("stories")
        .select("id")
        .eq("visibility", "public")
        .in("status", PUBLIC_STATUSES)
        .eq("content_origin", params.contentOrigin)
        .limit(5000);
      matching = new Set((allPublic ?? []).map((row) => String(row.id)));
    } else {
      const { data: matchedRows } = await db
        .from("stories")
        .select("id")
        .in("id", [...matching])
        .eq("content_origin", params.contentOrigin);
      matching = new Set((matchedRows ?? []).map((row) => String(row.id)));
    }
    if (matching.size === 0) return [];
  }

  if (hasAudio) {
    const { getStoryIdsWithPublishedAudio } = await import("@/src/lib/audio/audio-summary");
    const withAudio = new Set(await getStoryIdsWithPublishedAudio());
    if (!matching) {
      matching = withAudio;
    } else if (params.hasAudio === "yes") {
      matching = new Set([...matching].filter((id) => withAudio.has(id)));
    } else {
      matching = new Set([...matching].filter((id) => !withAudio.has(id)));
    }
    if (matching.size === 0) return [];
  }

  if (hasVideo) {
    const { getStoryIdsWithPublishedFilm } = await import("@/src/lib/film-adaptations/film-card-summary");
    const withVideo = new Set(await getStoryIdsWithPublishedFilm());
    if (!matching) {
      matching = withVideo;
    } else if (params.hasVideo === "yes") {
      matching = new Set([...matching].filter((id) => withVideo.has(id)));
    } else {
      matching = new Set([...matching].filter((id) => !withVideo.has(id)));
    }
    if (matching.size === 0) return [];
  }

  return matching ? [...matching] : null;
}

export async function getPublicStoryIdsForTaxonomyTerm(
  db: DatabaseClient,
  type: TaxonomyType,
  slug: string,
  limit = 5000
) {
  const termId = await getActiveTermId(db, type, slug);
  if (!termId) return [];
  if (type === "presentation_mode") {
    const { data } = await db
      .from("story_presentation_settings")
      .select("story_id, stories!inner(id)")
      .eq("mode", slug.trim())
      .eq("stories.visibility", "public")
      .in("stories.status", PUBLIC_STATUSES)
      .limit(limit);
    return [...new Set((data ?? []).map((row) => String(row.story_id)))];
  }
  return storyIdsForTerm(db, termId, type, limit);
}
