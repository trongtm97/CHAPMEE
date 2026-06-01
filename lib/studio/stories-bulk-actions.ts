"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { studioPath } from "@/lib/studio/constants";
import { persistStoryTaxonomyFromForm } from "@/lib/creator/persist-story-taxonomy";
import { loadStoryTaxonomyBulkPersistInput } from "@/lib/studio/story-taxonomy-bulk-context";
import { isTaxonomyMainGenreTermId } from "@/lib/taxonomy/story-genre-labels";

export type BulkActionResult = {
  ok: boolean;
  successCount: number;
  failedCount: number;
  errors: string[];
  error?: string;
};

type ActionResult = { ok: boolean; error?: string };

const BATCH_SIZE = 5;
const STORIES_PATH = studioPath("/stories");

async function runBatched<T>(
  items: T[],
  worker: (item: T) => Promise<ActionResult>
): Promise<BulkActionResult> {
  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (let index = 0; index < items.length; index += BATCH_SIZE) {
    const batch = items.slice(index, index + BATCH_SIZE);
    const results = await Promise.all(batch.map(worker));

    for (const result of results) {
      if (result.ok) {
        successCount += 1;
      } else {
        failedCount += 1;
        if (result.error) {
          errors.push(result.error);
        }
      }
    }
  }

  if (successCount > 0) {
    revalidatePath(STORIES_PATH);
  }

  return {
    errors: errors.slice(0, 5),
    failedCount,
    ok: successCount > 0,
    successCount
  };
}

async function assertStudioAccess() {
  const { creatorProfile, error } = await getStudioAccess(STORIES_PATH);

  if (error || !creatorProfile) {
    return { creatorProfile: null, error: error ?? "Không có quyền truy cập Studio." };
  }

  return { creatorProfile, error: null };
}

async function getOwnedStoryIds(creatorId: string, storyIds: string[]) {
  if (storyIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id")
    .eq("creator_id", creatorId)
    .in("id", storyIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.id as string);
}

export async function bulkHideStoriesAction(storyIds: string[]): Promise<BulkActionResult> {
  const access = await assertStudioAccess();

  if (access.error || !access.creatorProfile) {
    return { errors: [], failedCount: storyIds.length, ok: false, successCount: 0, error: access.error };
  }

  try {
    const ownedIds = await getOwnedStoryIds(access.creatorProfile.id, storyIds);
    const supabase = await createClient();

    return runBatched(ownedIds, async (storyId) => {
      const { error } = await supabase
        .from("stories")
        .update({ status: "archived", visibility: "private" })
        .eq("id", storyId);

      return error ? { ok: false, error: error.message } : { ok: true };
    });
  } catch (caught) {
    return {
      errors: [],
      error: caught instanceof Error ? caught.message : "Không thể ẩn truyện.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }
}

export async function bulkUnhideStoriesAction(storyIds: string[]): Promise<BulkActionResult> {
  const access = await assertStudioAccess();

  if (access.error || !access.creatorProfile) {
    return { errors: [], failedCount: storyIds.length, ok: false, successCount: 0, error: access.error };
  }

  try {
    const ownedIds = await getOwnedStoryIds(access.creatorProfile.id, storyIds);
    const supabase = await createClient();

    return runBatched(ownedIds, async (storyId) => {
      const { error } = await supabase
        .from("stories")
        .update({ status: "draft", visibility: "private" })
        .eq("id", storyId);

      return error ? { ok: false, error: error.message } : { ok: true };
    });
  } catch (caught) {
    return {
      errors: [],
      error: caught instanceof Error ? caught.message : "Không thể hiện lại truyện.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }
}

export async function bulkMarkCompletedAction(storyIds: string[]): Promise<BulkActionResult> {
  const access = await assertStudioAccess();

  if (access.error || !access.creatorProfile) {
    return { errors: [], failedCount: storyIds.length, ok: false, successCount: 0, error: access.error };
  }

  try {
    const ownedIds = await getOwnedStoryIds(access.creatorProfile.id, storyIds);
    const supabase = await createClient();

    return runBatched(ownedIds, async (storyId) => {
      const { error } = await supabase
        .from("stories")
        .update({ is_completed: true })
        .eq("id", storyId);

      return error ? { ok: false, error: error.message } : { ok: true };
    });
  } catch (caught) {
    return {
      errors: [],
      error: caught instanceof Error ? caught.message : "Không thể đánh dấu hoàn thành.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }
}

export async function bulkMoveToDraftAction(storyIds: string[]): Promise<BulkActionResult> {
  const access = await assertStudioAccess();

  if (access.error || !access.creatorProfile) {
    return { errors: [], failedCount: storyIds.length, ok: false, successCount: 0, error: access.error };
  }

  try {
    const ownedIds = await getOwnedStoryIds(access.creatorProfile.id, storyIds);
    const supabase = await createClient();

    return runBatched(ownedIds, async (storyId) => {
      const { error } = await supabase
        .from("stories")
        .update({ status: "draft", visibility: "private" })
        .eq("id", storyId);

      return error ? { ok: false, error: error.message } : { ok: true };
    });
  } catch (caught) {
    return {
      errors: [],
      error: caught instanceof Error ? caught.message : "Không thể chuyển về nháp.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }
}

export async function bulkApplyTaxonomyTermsAction(
  storyIds: string[],
  termIds: string[],
  mode: "add" | "replace"
): Promise<BulkActionResult> {
  const access = await assertStudioAccess();

  if (access.error || !access.creatorProfile) {
    return { errors: [], failedCount: storyIds.length, ok: false, successCount: 0, error: access.error };
  }

  if (termIds.length === 0) {
    return {
      errors: [],
      error: "Chọn ít nhất một nhãn taxonomy.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }

  try {
    const ownedIds = await getOwnedStoryIds(access.creatorProfile.id, storyIds);
    const supabase = await createClient();

    return runBatched(ownedIds, async (storyId) => {
      const ctx = await loadStoryTaxonomyBulkPersistInput(supabase, storyId);
      let ids = [...termIds];

      if (mode === "add") {
        ids = [...new Set([...ctx.taxonomyTermIds, ...termIds])];
      } else {
        const { data: incomingTerms } = await supabase
          .from("taxonomy_terms")
          .select("id, type")
          .in("id", termIds);

        const replaceTypes = new Set(
          (incomingTerms ?? []).map((row) => String(row.type))
        );

        if (replaceTypes.size > 0 && ctx.taxonomyTermIds.length > 0) {
          const { data: existingTerms } = await supabase
            .from("taxonomy_terms")
            .select("id, type")
            .in("id", ctx.taxonomyTermIds);

          const kept = (existingTerms ?? [])
            .filter((row) => !replaceTypes.has(String(row.type)))
            .map((row) => String(row.id));

          ids = [...new Set([...kept, ...termIds])];
        }
      }

      const result = await persistStoryTaxonomyFromForm(supabase, storyId, {
        ...ctx,
        taxonomyTermIds: ids
      });

      if (!result.ok) {
        return { ok: false, error: result.error ?? "Không gắn được taxonomy." };
      }

      return { ok: true };
    });
  } catch (caught) {
    return {
      errors: [],
      error: caught instanceof Error ? caught.message : "Không thể gắn taxonomy.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }
}

export async function bulkRemoveTaxonomyTermsAction(
  storyIds: string[],
  termIds: string[]
): Promise<BulkActionResult> {
  const access = await assertStudioAccess();

  if (access.error || !access.creatorProfile) {
    return { errors: [], failedCount: storyIds.length, ok: false, successCount: 0, error: access.error };
  }

  if (termIds.length === 0) {
    return {
      errors: [],
      error: "Chọn nhãn cần gỡ.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }

  const removeSet = new Set(termIds);

  try {
    const ownedIds = await getOwnedStoryIds(access.creatorProfile.id, storyIds);
    const supabase = await createClient();

    return runBatched(ownedIds, async (storyId) => {
      const ctx = await loadStoryTaxonomyBulkPersistInput(supabase, storyId);
      const remaining = ctx.taxonomyTermIds.filter((id) => !removeSet.has(id));

      const result = await persistStoryTaxonomyFromForm(supabase, storyId, {
        ...ctx,
        taxonomyTermIds: remaining
      });

      if (!result.ok) {
        return { ok: false, error: result.error ?? "Không gỡ được taxonomy." };
      }

      return { ok: true };
    });
  } catch (caught) {
    return {
      errors: [],
      error: caught instanceof Error ? caught.message : "Không thể gỡ taxonomy.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }
}

export async function bulkAddGenreAction(
  storyIds: string[],
  genreId: string
): Promise<BulkActionResult> {
  const access = await assertStudioAccess();

  if (access.error || !access.creatorProfile) {
    return { errors: [], failedCount: storyIds.length, ok: false, successCount: 0, error: access.error };
  }

  if (!genreId.trim()) {
    return {
      errors: [],
      error: "Chọn thể loại trước khi gắn.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }

  try {
    const ownedIds = await getOwnedStoryIds(access.creatorProfile.id, storyIds);
    const supabase = await createClient();
    const isTaxonomyTerm = await isTaxonomyMainGenreTermId(supabase, genreId);

    return runBatched(ownedIds, async (storyId) => {
      if (isTaxonomyTerm) {
        const ctx = await loadStoryTaxonomyBulkPersistInput(supabase, storyId);
        let kept: string[] = [];

        if (ctx.taxonomyTermIds.length > 0) {
          const { data: existingTerms } = await supabase
            .from("taxonomy_terms")
            .select("id, type")
            .in("id", ctx.taxonomyTermIds);

          kept = (existingTerms ?? [])
            .filter((row) => String(row.type) !== "main_genre")
            .map((row) => String(row.id));
        }

        const result = await persistStoryTaxonomyFromForm(supabase, storyId, {
          ...ctx,
          taxonomyTermIds: [...kept, genreId]
        });

        return result.ok
          ? { ok: true }
          : { ok: false, error: result.error ?? "Không gắn được thể loại taxonomy." };
      }

      return {
        ok: false,
        error: "Chọn thể loại taxonomy (main_genre), không dùng legacy genre id."
      };
    });
  } catch (caught) {
    return {
      errors: [],
      error: caught instanceof Error ? caught.message : "Không thể gắn thể loại.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }
}

async function storyHasEngagement(storyId: string) {
  const supabase = await createClient();

  const [reads, comments] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("target_id", storyId)
      .eq("event_name", "open_story"),
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId)
  ]);

  return (reads.count ?? 0) + (comments.count ?? 0) > 0;
}

export async function exportStoriesTaxonomyV2Action(
  storyIds: string[]
): Promise<{ csv: string | null; error?: string }> {
  const access = await assertStudioAccess();
  if (access.error || !access.creatorProfile) {
    return { csv: null, error: access.error ?? "Không có quyền." };
  }
  if (storyIds.length === 0) {
    return { csv: null, error: "Không có truyện để xuất." };
  }

  const { fetchStoriesExportV2Action } = await import(
    "@/lib/studio/import-export-v2-server"
  );
  const result = await fetchStoriesExportV2Action(storyIds);
  return { csv: result.csv, error: result.error ?? undefined };
}

export async function exportStoriesCsvAction(
  storyIds: string[]
): Promise<{ csv: string | null; error?: string }> {
  const access = await assertStudioAccess();

  if (access.error || !access.creatorProfile) {
    return { csv: null, error: access.error ?? "Không có quyền truy cập Studio." };
  }

  if (storyIds.length === 0) {
    return { csv: null, error: "Không có truyện để xuất." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stories")
      .select("id, title, status, slug, updated_at, is_completed")
      .eq("creator_id", access.creatorProfile.id)
      .in("id", storyIds)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as Array<{
      id: string;
      title: string;
      status: string;
      slug: string;
      updated_at: string;
      is_completed: boolean;
    }>;

    const header = ["id", "title", "slug", "status", "is_completed", "updated_at"];
    const lines = rows.map((row) =>
      [
        row.id,
        `"${row.title.replace(/"/g, '""')}"`,
        row.slug,
        row.status,
        row.is_completed ? "yes" : "no",
        row.updated_at
      ].join(",")
    );

    return { csv: [header.join(","), ...lines].join("\n") };
  } catch (caught) {
    return {
      csv: null,
      error: caught instanceof Error ? caught.message : "Không thể xuất danh sách."
    };
  }
}

export async function bulkDeleteStoriesAction(storyIds: string[]): Promise<BulkActionResult> {
  const access = await assertStudioAccess();

  if (access.error || !access.creatorProfile) {
    return { errors: [], failedCount: storyIds.length, ok: false, successCount: 0, error: access.error };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stories")
      .select("id, status")
      .eq("creator_id", access.creatorProfile.id)
      .in("id", storyIds);

    if (error) {
      throw new Error(error.message);
    }

    const owned = (data ?? []) as Array<{ id: string; status: string }>;

    return runBatched(owned, async (story) => {
      if (story.status !== "draft") {
        return { ok: false, error: "Chỉ xóa được truyện nháp." };
      }

      if (await storyHasEngagement(story.id)) {
        return { ok: false, error: "Truyện đã có tương tác — hãy ẩn thay vì xóa." };
      }

      const { error: deleteError } = await supabase
        .from("stories")
        .delete()
        .eq("id", story.id);

      return deleteError ? { ok: false, error: deleteError.message } : { ok: true };
    });
  } catch (caught) {
    return {
      errors: [],
      error: caught instanceof Error ? caught.message : "Không thể xóa truyện.",
      failedCount: storyIds.length,
      ok: false,
      successCount: 0
    };
  }
}
