import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { ColdStartAdminItem, ColdStartDashboardData } from "@/types/cold-start";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function hydrateTitles(
  supabase: ReturnType<typeof createAdminClient>,
  rows: Array<{
    id: string;
    item_type: string;
    item_id: string;
    author_user_id: string;
    status: string;
    target_impressions: number;
    delivered_impressions: number;
    qualification_metrics: Record<string, number>;
    started_at: string;
    ends_at: string | null;
  }>
): Promise<ColdStartAdminItem[]> {
  const storyIds = rows.filter((r) => r.item_type === "story").map((r) => r.item_id);
  const reelIds = rows.filter((r) => r.item_type === "reel").map((r) => r.item_id);
  const authorIds = [...new Set(rows.map((r) => r.author_user_id))];

  const [stories, reels, creators] = await Promise.all([
    storyIds.length
      ? supabase.from("stories").select("id, title").in("id", storyIds)
      : Promise.resolve({ data: [] }),
    reelIds.length
      ? supabase.from("reels_items").select("id, hook, title").in("id", reelIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("creator_profiles")
      .select(
        "user_id, pen_name, profiles!creator_profiles_user_id_fkey(display_name, username)"
      )
      .in("user_id", authorIds)
  ]);

  const storyMap = new Map((stories.data ?? []).map((s) => [s.id, s.title as string]));
  const reelMap = new Map(
    (reels.data ?? []).map((r) => [
      r.id,
      (r.hook as string) ?? (r.title as string) ?? "Reels"
    ])
  );
  const authorMap = new Map<
    string,
    { displayName: string; username: string | null }
  >();

  for (const row of (creators.data ?? []) as unknown as Array<{
    user_id: string;
    pen_name: string;
    profiles: { display_name: string | null; username: string | null } | null;
  }>) {
    const profile = firstRelation(row.profiles);
    authorMap.set(row.user_id, {
      displayName: resolvePublicDisplayName(profile, { pen_name: row.pen_name }),
      username: profile?.username ?? null
    });
  }

  return rows.map((row) => {
    const metrics = row.qualification_metrics ?? {};
    const author = authorMap.get(row.author_user_id);
    let title = row.item_id;

    if (row.item_type === "story") title = storyMap.get(row.item_id) ?? title;
    if (row.item_type === "reel") title = reelMap.get(row.item_id) ?? title;
    if (row.item_type === "author") title = author?.displayName ?? "Tác giả mới";

    return {
      id: row.id,
      itemType: row.item_type as ColdStartAdminItem["itemType"],
      itemId: row.item_id,
      title,
      authorDisplayName: author?.displayName ?? "—",
      authorUsername: author?.username ?? null,
      targetImpressions: row.target_impressions,
      deliveredImpressions: row.delivered_impressions,
      completionRate: Number(metrics.completion_rate ?? 0),
      reportRate: Number(metrics.report_rate ?? 0),
      hideRate: Number(metrics.hide_rate ?? 0),
      status: row.status as ColdStartAdminItem["status"],
      startedAt: row.started_at,
      endsAt: row.ends_at
    };
  });
}

export async function loadColdStartDashboardData(): Promise<ColdStartDashboardData> {
  const supabase = createAdminClient();

  try {
    const { data: rows, error } = await supabase
      .from("cold_start_tests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const all = rows ?? [];
    const activeCount = all.filter((r) => r.status === "active").length;
    const qualifiedCount = all.filter((r) => r.status === "qualified").length;
    const failedCount = all.filter((r) => r.status === "failed").length;
    const newAuthorsTesting = all.filter(
      (r) => r.item_type === "author" && r.status === "active"
    ).length;

    const totalImpressionsDelivered = all.reduce(
      (sum, row) => sum + Number(row.delivered_impressions ?? 0),
      0
    );

    const finished = all.filter((r) =>
      ["qualified", "failed", "completed"].includes(r.status as string)
    ).length;
    const qualificationRate =
      finished > 0 ? (qualifiedCount / finished) * 100 : 0;

    const items = await hydrateTitles(supabase, all as Parameters<typeof hydrateTitles>[1]);

    return {
      error: null,
      activeCount,
      qualifiedCount,
      failedCount,
      newAuthorsTesting,
      totalImpressionsDelivered,
      qualificationRate,
      items
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        error: "Migration cold_start_tests chưa được apply.",
        activeCount: 0,
        qualifiedCount: 0,
        failedCount: 0,
        newAuthorsTesting: 0,
        totalImpressionsDelivered: 0,
        qualificationRate: 0,
        items: []
      };
    }

    return {
      error: error instanceof Error ? error.message : "Không tải được cold start.",
      activeCount: 0,
      qualifiedCount: 0,
      failedCount: 0,
      newAuthorsTesting: 0,
      totalImpressionsDelivered: 0,
      qualificationRate: 0,
      items: []
    };
  }
}
