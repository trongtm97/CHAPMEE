import type { DatabaseClient } from "@/lib/db/types";
import type {
  ColdStartItemType,
  ColdStartQualificationMetrics,
  ColdStartTestRow
} from "@/types/cold-start";

function impressionFilter(test: ColdStartTestRow) {
  if (test.item_type === "author") {
    return {
      column: "author_user_id" as const,
      value: test.author_user_id
    };
  }
  return {
    column: "item_id" as const,
    value: test.item_id
  };
}

export async function computeTestMetrics(
  db: DatabaseClient,
  test: ColdStartTestRow
): Promise<ColdStartQualificationMetrics> {
  const filter = impressionFilter(test);

  const { count: impressions } = await db
    .from("exposure_events")
    .select("id", { count: "exact", head: true })
    .eq(filter.column === "author_user_id" ? "author_user_id" : "item_id", filter.value)
    .gte("created_at", test.started_at);

  let actionQuery = db
    .from("user_action_events")
    .select("action_type")
    .gte("created_at", test.started_at);

  if (test.item_type === "author") {
    actionQuery = actionQuery.eq("author_user_id", test.author_user_id);
  } else if (test.item_type === "story") {
    actionQuery = actionQuery.eq("story_id", test.story_id ?? test.item_id);
  } else if (test.item_type === "reel") {
    actionQuery = actionQuery.eq("reel_id", test.item_id);
  }

  const { data: actions } = await actionQuery.limit(5000);

  const counts = {
    read_complete: 0,
    next_chapter_click: 0,
    save: 0,
    report: 0,
    hide: 0,
    open_story: 0,
    click: 0
  };

  for (const row of actions ?? []) {
    const type = row.action_type as keyof typeof counts;
    if (type in counts) counts[type] += 1;
  }

  const imp = impressions ?? 0;

  const metrics: ColdStartQualificationMetrics = {
    impressions: imp,
    completion_rate: imp > 0 ? counts.read_complete / imp : 0,
    next_chapter_rate:
      counts.read_complete > 0
        ? counts.next_chapter_click / counts.read_complete
        : 0,
    save_rate: imp > 0 ? counts.save / imp : 0,
    report_rate: imp > 0 ? counts.report / imp : 0,
    hide_rate: imp > 0 ? counts.hide / imp : 0,
    evaluated_at: new Date().toISOString()
  };

  if (test.item_type === "reel") {
    metrics.reels_to_read_rate =
      imp > 0 ? (counts.open_story + counts.click) / imp : 0;
  }
  return metrics;
}

export async function countDeliveredImpressions(
  db: DatabaseClient,
  test: Pick<ColdStartTestRow, "item_type" | "item_id" | "author_user_id" | "started_at">
) {
  let query = db
    .from("exposure_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", test.started_at);

  if (test.item_type === "author") {
    query = query.eq("author_user_id", test.author_user_id);
  } else {
    query = query.eq("item_id", test.item_id);
  }

  const { count } = await query;
  return count ?? 0;
}

export function mapItemTypeToExposureType(itemType: ColdStartItemType) {
  if (itemType === "reel") return "reel";
  if (itemType === "story") return "story";
  return "story";
}
