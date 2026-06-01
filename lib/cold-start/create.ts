import type { SupabaseClient } from "@supabase/supabase-js";
import {
  coldStartEndsAt,
  loadColdStartConfig
} from "@/lib/cold-start/config";
import {
  applyAuthorColdStartLimit,
  scaledTargetImpressions
} from "@/lib/cold-start/limits";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { ColdStartItemType, ColdStartTestRow } from "@/types/cold-start";

async function insertTest(
  supabase: SupabaseClient,
  input: {
    itemType: ColdStartItemType;
    itemId: string;
    storyId: string | null;
    authorUserId: string;
    targetImpressions: number;
  }
) {
  if (input.targetImpressions <= 0) {
    return { ok: false as const, error: "Cold start quota bị giảm về 0." };
  }

  const config = await loadColdStartConfig();
  const startedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("cold_start_tests")
    .insert({
      item_type: input.itemType,
      item_id: input.itemId,
      story_id: input.storyId,
      author_user_id: input.authorUserId,
      status: "active",
      target_impressions: input.targetImpressions,
      delivered_impressions: 0,
      started_at: startedAt,
      ends_at: coldStartEndsAt(startedAt, config.maxTestWindowHours),
      qualification_metrics: {},
      updated_at: startedAt
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingSchemaError(error)) {
      return { ok: false as const, error: "cold_start_tests chưa migrate." };
    }
    if (error.code === "23505") {
      return { ok: false as const, error: "Test đã tồn tại." };
    }
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, test: data as ColdStartTestRow };
}

async function resolveStoryAuthor(
  supabase: SupabaseClient,
  storyId: string
): Promise<{ authorUserId: string | null }> {
  const { data } = await supabase
    .from("stories")
    .select("creator_profiles(user_id)")
    .eq("id", storyId)
    .maybeSingle();

  const creator = Array.isArray(data?.creator_profiles)
    ? data?.creator_profiles[0]
    : data?.creator_profiles;

  return { authorUserId: (creator?.user_id as string) ?? null };
}

export async function createColdStartTestForStory(
  supabase: SupabaseClient,
  storyId: string
) {
  const config = await loadColdStartConfig();
  const { authorUserId } = await resolveStoryAuthor(supabase, storyId);

  if (!authorUserId) {
    return { ok: false as const, error: "Không xác định được tác giả." };
  }

  const limit = await applyAuthorColdStartLimit(supabase, authorUserId);
  if (!limit.allowed) {
    return { ok: false as const, error: limit.reason ?? "Vượt giới hạn cold start." };
  }

  const target = scaledTargetImpressions(
    config.newStoryInitialImpressions,
    limit
  );

  return insertTest(supabase, {
    itemType: "story",
    itemId: storyId,
    storyId,
    authorUserId,
    targetImpressions: target
  });
}

export async function createColdStartTestForReel(
  supabase: SupabaseClient,
  reelId: string
) {
  const config = await loadColdStartConfig();

  const { data: reel } = await supabase
    .from("reels_items")
    .select("owner_id, story_id")
    .eq("id", reelId)
    .maybeSingle();

  if (!reel?.owner_id) {
    return { ok: false as const, error: "Không tìm thấy Reels." };
  }

  const limit = await applyAuthorColdStartLimit(supabase, reel.owner_id);
  if (!limit.allowed) {
    return { ok: false as const, error: limit.reason ?? "Vượt giới hạn cold start." };
  }

  const target = scaledTargetImpressions(
    config.newReelInitialImpressions,
    limit
  );

  return insertTest(supabase, {
    itemType: "reel",
    itemId: reelId,
    storyId: (reel.story_id as string) ?? null,
    authorUserId: reel.owner_id,
    targetImpressions: target
  });
}

export async function createColdStartTestForAuthor(
  supabase: SupabaseClient,
  authorUserId: string
) {
  const config = await loadColdStartConfig();
  const limit = await applyAuthorColdStartLimit(supabase, authorUserId);
  if (!limit.allowed) {
    return { ok: false as const, error: limit.reason ?? "Vượt giới hạn cold start." };
  }

  const windowDays = config.maxTestWindowHours / 24;
  const target = scaledTargetImpressions(
    Math.round(config.newAuthorDailyMinImpressions * windowDays),
    limit
  );

  return insertTest(supabase, {
    itemType: "author",
    itemId: authorUserId,
    storyId: null,
    authorUserId,
    targetImpressions: target
  });
}

export async function isFirstPublishedStory(
  supabase: SupabaseClient,
  authorUserId: string
) {
  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", authorUserId)
    .maybeSingle();

  if (!creator?.id) return false;

  const { count } = await supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creator.id)
    .in("status", ["published", "approved"])
    .eq("visibility", "public");

  return (count ?? 0) === 1;
}

export async function onStoryPublished(
  supabase: SupabaseClient,
  storyId: string,
  authorUserId: string
) {
  const storyResult = await createColdStartTestForStory(supabase, storyId);

  let authorResult: Awaited<ReturnType<typeof createColdStartTestForAuthor>> | null =
    null;
  if (await isFirstPublishedStory(supabase, authorUserId)) {
    authorResult = await createColdStartTestForAuthor(supabase, authorUserId);
  }

  return { storyResult, authorResult };
}

export async function onReelPublished(supabase: SupabaseClient, reelId: string) {
  return createColdStartTestForReel(supabase, reelId);
}
