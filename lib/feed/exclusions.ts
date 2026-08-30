import type { DatabaseClient } from "@/lib/db/types";
import { candidateKey } from "@/lib/feed/cursor";

export async function loadUserFeedExclusions(
  db: DatabaseClient,
  userId: string | null | undefined
) {
  const excludeKeys = new Set<string>();
  const recentlySeenKeys = new Set<string>();

  if (!userId) {
    return { excludeKeys, recentlySeenKeys };
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [actionsRes, exposureRes] = await Promise.all([
    db
      .from("user_action_events")
      .select("action_type, item_type, item_id")
      .eq("user_id", userId)
      .in("action_type", ["hide", "report"])
      .limit(500),
    db
      .from("exposure_events")
      .select("item_type, item_id")
      .eq("user_id", userId)
      .gte("created_at", since24h)
      .limit(300)
  ]);

  for (const row of actionsRes.data ?? []) {
    excludeKeys.add(candidateKey({ itemType: row.item_type, itemId: row.item_id }));
  }

  for (const row of exposureRes.data ?? []) {
    recentlySeenKeys.add(
      candidateKey({ itemType: row.item_type, itemId: row.item_id })
    );
  }

  return { excludeKeys, recentlySeenKeys };
}
