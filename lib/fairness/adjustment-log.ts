import type { FairnessAdjustmentLogInput } from "@/types/fairness";
import type { DatabaseClient } from "@/lib/db/types";

export async function logFairnessAdjustments(
  db: DatabaseClient,
  logs: FairnessAdjustmentLogInput[]
) {
  if (logs.length === 0) return;

  const rows = logs.slice(0, 100).map((log) => ({
    item_type: log.itemType,
    item_id: log.itemId,
    story_id: log.storyId ?? null,
    author_user_id: log.authorUserId ?? null,
    surface: log.surface,
    adjustment_type: log.adjustmentType,
    old_score: log.oldScore,
    new_score: log.newScore,
    reason: log.reason ?? null,
    metadata: log.metadata ?? {}
  }));

  try {
    await db.from("fairness_adjustment_logs").insert(rows);
  } catch {
    // Audit logging must not break feed.
  }
}
