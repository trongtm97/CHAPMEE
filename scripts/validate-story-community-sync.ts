import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { loadEnvLocal } from "./lib/load-env-local";
import { buildCommentIdempotencyKey } from "@/lib/community-sync/comment-context";
import { createInteractionEvent } from "@/lib/community-sync/interaction-events";
import { INTERACTION_EVENT_TYPES } from "@/lib/community-sync/constants";
import { refreshGroupFeedVisibilityForComment } from "@/lib/community-sync/comment-sync";
import { getCommunitySyncSettings } from "@/lib/community-sync/sync-settings";
import { getStoryGroupFeedByStoryId } from "@/lib/community-sync/get-story-group-feed";

type StoryRow = { id: string; title: string | null; group_id: string };

async function main() {
  loadEnvLocal();

  const commentIdArg = process.argv.find((arg) => arg.startsWith("--comment-id="));
  const storyIdArg = process.argv.find((arg) => arg.startsWith("--story-id="));
  const commentId = commentIdArg?.split("=")[1]?.trim();
  const storyIdFilter = storyIdArg?.split("=")[1]?.trim();

  console.log("[validate-story-community-sync] Starting checks…");

  const settings = await getCommunitySyncSettings();
  console.log("✓ Settings loaded:", {
    syncChapterComments: settings.syncChapterComments,
    syncReelComments: settings.syncReelComments,
    collapseWindowMinutes: settings.collapseWindowMinutes
  });

  const { rows: tableRows } = await db.execute(sql`
    select
      (select count(*)::int from public.story_groups) as story_groups,
      (select count(*)::int from public.interaction_events) as interaction_events,
      (select count(*)::int from public.group_feed_items) as group_feed_items,
      (select count(*)::int from public.community_sync_settings) as community_sync_settings
  `);

  console.log("✓ Table counts:", tableRows[0]);

  const { rows: storyRows } = await db.execute(storyIdFilter
    ? sql`
        select s.id, s.title, g.id as group_id
        from public.story_groups g
        join public.stories s on s.id = g.story_id
        where s.id = ${storyIdFilter}::uuid
        limit 1
      `
    : sql`
        select s.id, s.title, g.id as group_id
        from public.story_groups g
        join public.stories s on s.id = g.story_id
        order by g.created_at desc
        limit 1
      `);

  const story = storyRows[0] as StoryRow | undefined;
  if (!story) {
    console.error("✗ No story group found. Run: npm run community-sync:backfill-story-groups -- --apply");
    process.exit(1);
  }

  console.log(`✓ Using story: ${story.title ?? story.id}`);

  const dedupeKey = buildCommentIdempotencyKey(
    "validate_test",
    "00000000-0000-4000-8000-000000000001"
  );

  const first = await createInteractionEvent({
    actorUserId: null,
    storyId: story.id,
    groupId: story.group_id,
    eventType: INTERACTION_EVENT_TYPES.commentCreated,
    sourceEntityType: "story",
    sourceEntityId: story.id,
    idempotencyKey: dedupeKey,
    metadataJson: { validate: true }
  });

  const second = await createInteractionEvent({
    actorUserId: null,
    storyId: story.id,
    groupId: story.group_id,
    eventType: INTERACTION_EVENT_TYPES.commentCreated,
    sourceEntityType: "story",
    sourceEntityId: story.id,
    idempotencyKey: dedupeKey,
    metadataJson: { validate: true }
  });

  if (!first.created || second.created || !second.skipped) {
    console.error("✗ Idempotency check failed", { first, second });
    process.exit(1);
  }

  console.log("✓ Idempotency: retry did not duplicate event");

  const feed = await getStoryGroupFeedByStoryId(story.id, { limit: 5 });
  console.log(`✓ Feed API data layer: ${feed.items.length} items, hasMore=${feed.hasMore}`);

  if (commentId) {
    const visibility = await refreshGroupFeedVisibilityForComment(commentId);
    console.log("✓ Comment visibility refresh:", visibility);
  }

  console.log("\n[validate-story-community-sync] All checks passed.");
}

main().catch((error) => {
  console.error(
    `[validate-story-community-sync] Fatal: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
