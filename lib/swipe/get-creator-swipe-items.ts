import { createClient } from "@/lib/supabase/server";
import { mapSwipeListRow } from "@/lib/swipe/map-swipe-row";
import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import type { SwipeItemListItem, SwipeListTab } from "@/types/swipe";

const LIST_SELECT =
  "*, stories!inner(title, slug), episodes(title, episode_number)";

function statusForTab(tab: SwipeListTab): string[] | null {
  switch (tab) {
    case "draft":
      return ["draft"];
    case "scheduled":
      return ["scheduled"];
    case "published":
      return ["published"];
    case "hidden":
      return ["hidden"];
    case "needs_fix":
      return ["rejected"];
    case "all":
    default:
      return null;
  }
}

export async function getCreatorSwipeItems(input: {
  ownerId: string;
  tab?: SwipeListTab;
  page?: number;
}) {
  const tab = input.tab ?? "all";
  const page = parseStudioPage(String(input.page ?? 1));

  try {
    const supabase = await createClient();
    let query = supabase
      .from("swipe_items")
      .select("*, stories(title, slug), episodes(title, episode_number)")
      .eq("owner_id", input.ownerId)
      .order("updated_at", { ascending: false });

    const statuses = statusForTab(tab);

    if (statuses) {
      query = query.in("status", statuses);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const items = (data ?? []).map((row) =>
      mapSwipeListRow(row as Parameters<typeof mapSwipeListRow>[0])
    );
    const paged = paginateList(items, page, 20);

    return {
      error: null as string | null,
      ...paged
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không tải được danh sách Swipe.",
      items: [] as SwipeItemListItem[],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1
    };
  }
}
