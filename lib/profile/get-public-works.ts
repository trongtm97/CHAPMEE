import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { createClient } from "@/lib/data/server";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { mapStoryStructureFromRow } from "@/lib/stories/story-structure";
import {
  getCatalogStoryIdsByMetricView,
  isStoryCatalogMetricsViewAvailable
} from "@/lib/stories/catalog-metrics-view";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { formatCompactCount } from "@/lib/profile/profileIdentity";
import { createExcerpt } from "@/lib/text/createExcerpt";
import type {
  ProfilePrivacySettings,
  PublicWorkItem,
  PublicWorksSort
} from "@/types/public-profile";

export const PUBLIC_WORKS_PAGE_SIZE = 20;

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  hook: string | null;
  cover_url: string | null;
  is_completed: boolean | null;
  status: string;
  updated_at: string | null;
  published_at: string | null;
  structure_type?: string | null;
  standalone_reading_time_minutes?: number | null;
  creator_profiles: { pen_name: string | null } | { pen_name: string | null }[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function statusLabel(isCompleted: boolean | null, status: string) {
  if (isCompleted) {
    return "Hoàn thành";
  }
  if (status === "published" || status === "approved") {
    return "Đang ra";
  }
  return "Đang soạn";
}

function normalizeSort(raw: string | undefined): PublicWorksSort {
  if (raw === "published" || raw === "popular") {
    return raw;
  }
  return "updated";
}

async function loadOwnerStoryIds(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await db
    .from("stories")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .is("deleted_at", null);

  return (data ?? []).map((row) => String((row as { id: string }).id));
}

export async function getPublicWorksForUser(
  userId: string,
  creatorId: string | null,
  privacy: ProfilePrivacySettings,
  page = 1,
  sort: PublicWorksSort | string = "updated"
): Promise<{ items: PublicWorkItem[]; total: number }> {
  if (!privacy.showCreatorWorks || !creatorId) {
    return { items: [], total: 0 };
  }

  const resolvedSort = normalizeSort(sort);
  const db = await createClient();
  const from = (page - 1) * PUBLIC_WORKS_PAGE_SIZE;

  const { count } = await db
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", userId)
    .eq("visibility", "public")
    .in("status", ["published", "approved"]);

  const total = count ?? 0;
  if (total === 0) {
    return { items: [], total: 0 };
  }

  let storyIds: string[] = [];

  if (resolvedSort === "popular" && (await isStoryCatalogMetricsViewAvailable(db))) {
    const ownerIds = await loadOwnerStoryIds(db, userId);
    const metricPage = await getCatalogStoryIdsByMetricView(db, "hot", {
      storyIds: ownerIds,
      page,
      pageSize: PUBLIC_WORKS_PAGE_SIZE
    });
    storyIds = metricPage?.storyIds ?? [];
    if (!storyIds.length) {
      return { items: [], total: metricPage?.totalCount ?? total };
    }
  } else {
    let query = db
      .from("stories")
      .select("id")
      .eq("owner_user_id", userId)
      .eq("visibility", "public")
      .in("status", ["published", "approved"]);

    if (resolvedSort === "published") {
      query = query.order("published_at", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("updated_at", { ascending: false });
    }

    const { data: idRows } = await query.range(from, from + PUBLIC_WORKS_PAGE_SIZE - 1);
    storyIds = (idRows ?? []).map((row) => String((row as { id: string }).id));
  }

  if (!storyIds.length) {
    return { items: [], total };
  }

  const { data, error } = await db
    .from("stories")
    .select(
      `id, title, slug, public_code, hook, cover_url, is_completed, status, updated_at, published_at, structure_type, standalone_reading_time_minutes, ${CREATOR_PROFILE_STORY_JOIN}`
    )
    .in("id", storyIds);

  if (error || !data) {
    return { items: [], total };
  }

  const rowById = new Map(
    (data as unknown as StoryRow[]).map((row) => [row.id, row] as const)
  );
  const orderedRows = storyIds
    .map((id) => rowById.get(id))
    .filter((row): row is StoryRow => Boolean(row));

  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);
  const episodeCounts = new Map<string, number>();
  const metricByStory = new Map<string, { saveCount: number; discoveryScore: number }>();

  const [{ data: episodes }, { data: metrics }] = await Promise.all([
    db
      .from("episodes")
      .select("story_id")
      .in("story_id", storyIds)
      .in("status", ["published", "approved"]),
    db
      .from("story_catalog_metrics")
      .select("story_id, save_count, discovery_score")
      .in("story_id", storyIds)
  ]);

  for (const episode of episodes ?? []) {
    const storyId = String((episode as { story_id: string }).story_id);
    episodeCounts.set(storyId, (episodeCounts.get(storyId) ?? 0) + 1);
  }

  for (const metric of metrics ?? []) {
    const row = metric as {
      story_id: string;
      save_count: number | null;
      discovery_score: number | null;
    };
    metricByStory.set(row.story_id, {
      saveCount: Number(row.save_count ?? 0),
      discoveryScore: Number(row.discovery_score ?? 0)
    });
  }

  const items: PublicWorkItem[] = orderedRows.map((row) => {
    const creator = firstRelation(row.creator_profiles);
    const structure = mapStoryStructureFromRow(row);
    const metric = metricByStory.get(row.id);
    const readCount = metric?.discoveryScore
      ? Number(metric.discoveryScore)
      : null;

    return {
      id: row.id,
      slug: row.slug,
      publicCode: row.public_code,
      title: row.title,
      description: row.hook ? createExcerpt(row.hook, 120) : null,
      coverUrl: resolveStoryCoverUrl(row.cover_url),
      chapterCount: episodeCounts.get(row.id) ?? 0,
      readCount: readCount && readCount > 0 ? readCount : null,
      readCountLabel:
        readCount && readCount > 0 ? formatCompactCount(readCount) : null,
      likeCount: metric?.saveCount ? metric.saveCount : null,
      likeCountLabel: metric?.saveCount
        ? `${formatCompactCount(metric.saveCount)} lưu`
        : null,
      statusLabel: statusLabel(row.is_completed, row.status),
      authorName: resolveCreatorRowName(creator),
      genreName: taxonomyByStory.get(row.id)?.mainGenreName ?? null,
      updatedAt: row.updated_at,
      structureType: structure.structureType,
      standaloneReadingTimeMinutes: structure.standaloneReadingTimeMinutes
    };
  });

  const { enrichStoriesWithAudioCardSummary } = await import("@/src/lib/audio/audio-summary");
  const enrichedItems = await enrichStoriesWithAudioCardSummary(items);

  return { items: enrichedItems, total };
}
