import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";

async function fetchCreatorFollowerCount(
  db: Awaited<ReturnType<typeof createClient>>,
  creatorId: string
): Promise<number> {
  const { data, error } = await db.rpc("get_public_creator_profile_metrics", {
    input_creator_id: creatorId
  });

  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return Number(row?.follower_count ?? 0);
  }

  if (isMissingSchemaError(error)) {
    const { count } = await db
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", creatorId)
      .eq("following_type", "creator");

    return Number(count ?? 0);
  }

  return 0;
}

/** Real follower counts keyed by `creator_profiles.id` (same source as public profile). */
export async function getCreatorFollowerCountsMap(
  creatorIds: string[]
): Promise<Map<string, number>> {
  const uniqueIds = [...new Set(creatorIds.filter(Boolean))];
  const map = new Map<string, number>();

  if (!uniqueIds.length) {
    return map;
  }

  const db = await createClient();
  const counts = await Promise.all(
    uniqueIds.map(async (creatorId) => ({
      creatorId,
      count: await fetchCreatorFollowerCount(db, creatorId)
    }))
  );

  for (const { creatorId, count } of counts) {
    map.set(creatorId, count);
  }

  return map;
}
