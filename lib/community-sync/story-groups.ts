import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { storyGroups } from "@/lib/db/schema/story-community-sync";
import { isAutoCreateStoryGroupEnabled } from "@/lib/community-sync/sync-settings";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type {
  BackfillStoryGroupsResult,
  StoryGroupRow,
  StoryGroupVisibility
} from "@/types/story-community-sync";

type StorySourceRow = {
  id: string;
  title: string;
  slug: string;
  visibility: string;
  status: string;
  hook: string | null;
};

function mapStoryGroupRow(row: typeof storyGroups.$inferSelect): StoryGroupRow {
  return {
    id: row.id,
    storyId: row.storyId,
    groupSlug: row.groupSlug,
    title: row.title,
    description: row.description,
    visibility: row.visibility as StoryGroupVisibility,
    memberCount: row.memberCount,
    activityCount: row.activityCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function isPublishedPublicStory(story: StorySourceRow) {
  return (
    story.visibility === "public" &&
    publicContentStatuses.includes(story.status as (typeof publicContentStatuses)[number])
  );
}

async function fetchStorySource(storyId: string): Promise<StorySourceRow | null> {
  const { rows } = await db.execute(sql`
    select id, title, slug, visibility, status, hook
    from public.stories
    where id = ${storyId}::uuid
    limit 1
  `);

  return (rows[0] as StorySourceRow | undefined) ?? null;
}

async function findStoryGroupByStoryId(storyId: string): Promise<StoryGroupRow | null> {
  const rows = await db
    .select()
    .from(storyGroups)
    .where(eq(storyGroups.storyId, storyId))
    .limit(1);

  return rows[0] ? mapStoryGroupRow(rows[0]) : null;
}

function buildGroupPayload(story: StorySourceRow) {
  const visibility: StoryGroupVisibility =
    story.visibility === "private" ? "private" : "public";

  return {
    storyId: story.id,
    groupSlug: story.slug,
    title: story.title,
    description: story.hook,
    visibility
  };
}

export async function getOrCreateStoryGroup(
  storyId: string,
  options?: { force?: boolean }
): Promise<{ group: StoryGroupRow | null; created: boolean; error: string | null }> {
  const existing = await findStoryGroupByStoryId(storyId);
  if (existing) {
    return { group: existing, created: false, error: null };
  }

  const story = await fetchStorySource(storyId);
  if (!story) {
    return { group: null, created: false, error: "Story not found." };
  }

  if (!options?.force && !(await isAutoCreateStoryGroupEnabled())) {
    return {
      group: null,
      created: false,
      error: "auto_create_story_group is disabled."
    };
  }

  if (!options?.force && !isPublishedPublicStory(story)) {
    return {
      group: null,
      created: false,
      error: "Story is not a published public story."
    };
  }

  const payload = buildGroupPayload(story);

  try {
    const inserted = await db
      .insert(storyGroups)
      .values(payload)
      .onConflictDoNothing({ target: storyGroups.storyId })
      .returning();

    if (inserted[0]) {
      return { group: mapStoryGroupRow(inserted[0]), created: true, error: null };
    }

    const raced = await findStoryGroupByStoryId(storyId);
    return { group: raced, created: false, error: raced ? null : "Could not create story group." };
  } catch (error) {
    const raced = await findStoryGroupByStoryId(storyId);
    if (raced) {
      return { group: raced, created: false, error: null };
    }

    return {
      group: null,
      created: false,
      error: error instanceof Error ? error.message : "Could not create story group."
    };
  }
}

export async function backfillStoryGroupsForPublishedStories(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<BackfillStoryGroupsResult> {
  const dryRun = options?.dryRun ?? true;
  const limit = options?.limit ?? 50_000;

  const { rows } = await db.execute(sql`
    select s.id, s.title, s.slug, s.visibility, s.status, s.hook
    from public.stories s
    left join public.story_groups g on g.story_id = s.id
    where g.id is null
      and s.visibility = 'public'
      and s.status in ('approved', 'published')
    order by s.created_at asc
    limit ${limit}
  `);

  const candidates = rows as StorySourceRow[];
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const story of candidates) {
    if (dryRun) {
      created += 1;
      continue;
    }

    const result = await getOrCreateStoryGroup(story.id, { force: true });
    if (result.group && result.created) {
      created += 1;
    } else if (result.group) {
      skipped += 1;
    } else {
      errors += 1;
      console.error(
        `[backfill-story-groups] Failed for story ${story.id}: ${result.error ?? "unknown"}`
      );
    }
  }

  return {
    dryRun,
    candidates: candidates.length,
    created,
    skipped,
    errors
  };
}
