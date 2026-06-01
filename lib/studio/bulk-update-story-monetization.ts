"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import { resolveMonetizationBulkStoryIds } from "@/lib/studio/monetization-stories-query";
import { saveStoryMonetizationSettings } from "@/lib/studio/save-story-monetization-settings";
import { studioPath } from "@/lib/studio/constants";
import { updateStoryMonetization } from "@/lib/studio/update-story-monetization";
import { validateStudioCoinPrice } from "@/lib/studio/validate-coin-price";
import {
  getStoryMonetizationSettings,
  upsertStoryMonetizationSettings
} from "@/lib/supabase/story-monetization";
import { upsertChapterMonetizationSetting } from "@/lib/supabase/chapter-monetization";
import { createClient } from "@/lib/supabase/server";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import type {
  StudioMonetizationBulkAction,
  StudioMonetizationBulkResult,
  StudioMonetizationBulkScope
} from "@/types/studio-monetization-stories";

const CHAPTER_ONLY_BULK_ACTIONS = new Set<StudioMonetizationBulkAction>([
  "set_free_chapters",
  "set_coin_price",
  "apply_auto_pricing",
  "set_all_free"
]);

function filterStoryIdsForBulkAction(
  storyIds: string[],
  structureMap: Map<string, "chaptered" | "standalone">,
  action: StudioMonetizationBulkAction
) {
  if (!CHAPTER_ONLY_BULK_ACTIONS.has(action)) {
    return { applicable: storyIds, skipped: 0 };
  }

  const applicable: string[] = [];
  let skipped = 0;

  for (const storyId of storyIds) {
    const structure = structureMap.get(storyId) ?? "chaptered";
    if (structure === "standalone") {
      skipped += 1;
      continue;
    }
    applicable.push(storyId);
  }

  return { applicable, skipped };
}

const BATCH_SIZE = 25;

async function loadStoryStructureMap(storyIds: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("id, structure_type")
    .in("id", storyIds);

  return new Map(
    (data ?? []).map((row) => [
      String(row.id),
      normalizeStoryStructureType((row as { structure_type?: string }).structure_type)
    ])
  );
}

export type BulkMonetizationInput = {
  scope: StudioMonetizationBulkScope;
  selectedStoryIds: string[];
  action: StudioMonetizationBulkAction;
  coinPrice?: number | null;
  freeChaptersCount?: number;
  fullAccessPriceCoin?: number | null;
  autoPriceCoin?: number | null;
  autoPaidFromChapter?: number;
  overwriteOverrides?: boolean;
};

async function setAllChaptersFree(storyId: string, creatorUserId: string) {
  const supabase = await createClient();
  const { data: episodes } = await supabase
    .from("episodes")
    .select("id")
    .eq("story_id", storyId)
    .neq("status", "archived");

  for (const episode of episodes ?? []) {
    const result = await upsertChapterMonetizationSetting({
      chapterId: episode.id as string,
      storyId,
      creatorUserId,
      isPaid: false,
      coinPrice: null,
      freePreviewEnabled: false,
      freePreviewPercent: null,
      freePreviewChars: null,
      pricingSource: "free_manual",
      monetizationOverride: true
    });
    if (result.error) {
      return { ok: false as const, error: result.error };
    }
  }

  return { ok: true as const };
}

export async function bulkUpdateStoryMonetization(
  input: BulkMonetizationInput
): Promise<StudioMonetizationBulkResult> {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile || !state.user) {
    return { ok: false, successCount: 0, failedCount: 0, error: "Bạn cần đăng nhập Studio." };
  }

  const config = await buildStudioMonetizationConfigView({ includePrivate: true });

  if (
    !config.ecosystemEnabled ||
    !config.creatorMonetizationEnabled ||
    !config.paidChaptersEnabled
  ) {
    return { ok: false, successCount: 0, failedCount: 0, error: "Admin chưa bật chương trả phí." };
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(state.user.id);
  if (!creatorCanEarn) {
    return {
      ok: false,
      successCount: 0,
      failedCount: 0,
      error: "Kiếm tiền đang bị tắt bởi quản trị viên."
    };
  }

  const storyIds = await resolveMonetizationBulkStoryIds(
    state.creatorProfile,
    input.scope,
    input.selectedStoryIds
  );

  if (storyIds.length === 0) {
    return { ok: false, successCount: 0, failedCount: 0, error: "Không có truyện để áp dụng." };
  }

  const structureMap = await loadStoryStructureMap(storyIds);
  const { applicable: applicableStoryIds, skipped: skippedByStructure } =
    filterStoryIdsForBulkAction(storyIds, structureMap, input.action);

  if (applicableStoryIds.length === 0) {
    return {
      ok: false,
      successCount: 0,
      failedCount: 0,
      skippedCount: skippedByStructure,
      error:
        CHAPTER_ONLY_BULK_ACTIONS.has(input.action)
          ? "Thao tác này chỉ áp dụng cho truyện nhiều chương."
          : "Không có truyện phù hợp để áp dụng thao tác này."
    };
  }

  if (input.action === "set_full_access_price" || input.action === "set_coin_price") {
    const price =
      input.action === "set_full_access_price"
        ? input.fullAccessPriceCoin
        : input.coinPrice;
    const priceCheck = validateStudioCoinPrice(price, {
      allowFree: input.action !== "set_full_access_price",
      required: true
    });
    if (!priceCheck.ok) {
      return { ok: false, successCount: 0, failedCount: 0, error: priceCheck.error };
    }
  }

  if (input.action === "apply_auto_pricing" && input.autoPriceCoin != null) {
    const autoCheck = validateStudioCoinPrice(input.autoPriceCoin, {
      allowFree: false,
      required: true
    });
    if (!autoCheck.ok) {
      return { ok: false, successCount: 0, failedCount: 0, error: autoCheck.error };
    }
  }

  let successCount = 0;
  let failedCount = 0;

  for (let index = 0; index < applicableStoryIds.length; index += BATCH_SIZE) {
    const batch = applicableStoryIds.slice(index, index + BATCH_SIZE);

    for (const storyId of batch) {
      let ok = false;

      switch (input.action) {
        case "enable_paid": {
          const result = await updateStoryMonetization({
            storyId,
            monetizationEnabled: true,
            freeChaptersCount:
              input.freeChaptersCount ?? config.paidChapterFreeChaptersRequired,
            coinPrice: input.coinPrice ?? config.paidChapterDefaultCoinPrice
          });
          ok = result.ok;
          break;
        }
        case "disable_paid":
        case "disable_chapter_paid": {
          const result = await updateStoryMonetization({
            storyId,
            monetizationEnabled: false,
            freeChaptersCount: config.paidChapterFreeChaptersRequired,
            coinPrice: null
          });
          ok = result.ok;
          break;
        }
        case "set_coin_price": {
          const result = await updateStoryMonetization({
            storyId,
            monetizationEnabled: true,
            freeChaptersCount:
              input.freeChaptersCount ?? config.paidChapterFreeChaptersRequired,
            coinPrice: input.coinPrice ?? config.paidChapterDefaultCoinPrice
          });
          ok = result.ok;
          break;
        }
        case "set_free_chapters": {
          const result = await updateStoryMonetization({
            storyId,
            monetizationEnabled: true,
            freeChaptersCount:
              input.freeChaptersCount ?? config.paidChapterFreeChaptersRequired,
            coinPrice: input.coinPrice ?? config.paidChapterDefaultCoinPrice
          });
          ok = result.ok;
          break;
        }
        case "enable_full_access": {
          const saved = await saveStoryMonetizationSettings({
            storyId,
            patch: { full_access_enabled: true }
          });
          ok = saved.ok;
          break;
        }
        case "disable_full_access": {
          const saved = await saveStoryMonetizationSettings({
            storyId,
            patch: { full_access_enabled: false }
          });
          ok = saved.ok;
          break;
        }
        case "set_full_access_price": {
          const saved = await saveStoryMonetizationSettings({
            storyId,
            patch: {
              full_access_enabled: true,
              full_access_price_coin: input.fullAccessPriceCoin ?? null
            }
          });
          ok = saved.ok;
          break;
        }
        case "apply_auto_pricing": {
          const freeCount = Math.max(0, input.freeChaptersCount ?? 0);
          const paidFrom = input.autoPaidFromChapter ?? freeCount + 1;
          const saved = await saveStoryMonetizationSettings({
            storyId,
            patch: {
              auto_pricing_enabled: true,
              free_first_chapters_count: freeCount,
              auto_paid_from_chapter: paidFrom,
              auto_price_coin: input.autoPriceCoin ?? config.paidChapterDefaultCoinPrice
            },
            applyAutoPricing: true,
            overwriteOverrides: Boolean(input.overwriteOverrides)
          });
          ok = saved.ok;
          break;
        }
        case "set_all_free": {
          const disabled = await upsertStoryMonetizationSettings({
            story_id: storyId,
            creator_user_id: state.user.id,
            auto_pricing_enabled: false
          });
          const chapters = await setAllChaptersFree(storyId, state.user.id);
          ok = !disabled.error && chapters.ok;
          break;
        }
        case "reset": {
          const result = await updateStoryMonetization({
            storyId,
            monetizationEnabled: false,
            freeChaptersCount: config.paidChapterFreeChaptersRequired,
            coinPrice: null
          });
          await upsertStoryMonetizationSettings({
            story_id: storyId,
            creator_user_id: state.user.id,
            full_access_enabled: false,
            auto_pricing_enabled: false
          });
          ok = result.ok;
          break;
        }
      }

      if (ok) {
        successCount += 1;
      } else {
        failedCount += 1;
      }
    }
  }

  revalidatePath(studioPath("/monetization"));

  return {
    ok: successCount > 0,
    successCount,
    failedCount,
    skippedCount: skippedByStructure,
    error:
      successCount === 0
        ? "Không áp dụng được cho truyện nào. Kiểm tra loại truyện và cấu hình."
        : failedCount > 0 || skippedByStructure > 0
          ? `Hoàn tất ${successCount} truyện${skippedByStructure > 0 ? `, bỏ qua ${skippedByStructure} truyện không phù hợp` : ""}${failedCount > 0 ? `, lỗi ${failedCount}` : ""}.`
          : undefined
  };
}

export async function exportMonetizationStoriesCsv(
  scope: StudioMonetizationBulkScope,
  selectedStoryIds: string[]
): Promise<{ ok: boolean; csv?: string; error?: string }> {
  const state = await getCurrentCreatorProfile();
  if (!state.creatorProfile || !state.user) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  const storyIds = await resolveMonetizationBulkStoryIds(
    state.creatorProfile,
    scope,
    selectedStoryIds
  );

  if (storyIds.length === 0) {
    return { ok: false, error: "Không có truyện để xuất." };
  }

  const supabase = await createClient();
  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, slug, status")
    .in("id", storyIds);

  const header =
    "story_id,title,slug,status,full_access_enabled,full_access_price_coin,auto_pricing_enabled,paid_chapter_count\n";
  const lines: string[] = [header];

  for (const story of stories ?? []) {
    const settings = await getStoryMonetizationSettings(story.id as string);
    const { count: paidCount } = await supabase
      .from("chapter_monetization_settings")
      .select("chapter_id", { count: "exact", head: true })
      .eq("story_id", story.id)
      .eq("is_paid", true);

    const s = settings.data;
    const row = [
      story.id,
      `"${String(story.title).replace(/"/g, '""')}"`,
      story.slug,
      story.status,
      s?.full_access_enabled ?? false,
      s?.full_access_price_coin ?? "",
      s?.auto_pricing_enabled ?? false,
      paidCount ?? 0
    ].join(",");
    lines.push(row);
  }

  return { ok: true, csv: lines.join("\n") };
}
