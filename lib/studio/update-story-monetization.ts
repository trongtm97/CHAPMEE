"use server";

import { revalidatePath } from "next/cache";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { upsertChapterMonetizationSetting } from "@/lib/supabase/chapter-monetization";
import { createClient } from "@/lib/supabase/server";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import { studioPath } from "@/lib/studio/constants";
import { isStoryMonetizationAllowedByQuality } from "@/lib/content-quality/public-visibility";
import { validateChapterCoinPrice } from "@/lib/studio/validate-chapter-coin-price";

export type UpdateStoryMonetizationInput = {
  storyId: string;
  monetizationEnabled: boolean;
  freeChaptersCount: number;
  coinPrice: number | null;
};

export async function updateStoryMonetization(
  input: UpdateStoryMonetizationInput
): Promise<{ ok: boolean; error?: string }> {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile || !state.user) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  const config = await buildStudioMonetizationConfigView({ includePrivate: true });

  if (
    !config.ecosystemEnabled ||
    !config.creatorMonetizationEnabled ||
    !config.paidChaptersEnabled
  ) {
    return { ok: false, error: "Admin chưa bật chương trả phí." };
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(state.user.id);
  if (!creatorCanEarn) {
    return { ok: false, error: "Kiếm tiền đang bị tắt bởi ChapMee." };
  }

  try {
    await assertCreatorOwnsStory(state.creatorProfile, input.storyId);
  } catch {
    return { ok: false, error: "Bạn không có quyền cấu hình truyện này." };
  }

  const supabase = await createClient();
  const { data: storyQuality } = await supabase
    .from("stories")
    .select("quality_status, monetization_disabled_by_quality")
    .eq("id", input.storyId)
    .maybeSingle();

  if (
    storyQuality &&
    !isStoryMonetizationAllowedByQuality({
      monetizationDisabledByQuality: storyQuality.monetization_disabled_by_quality,
      qualityStatus: storyQuality.quality_status
    })
  ) {
    return {
      error: "Truyện bị tắt kiếm tiền do chất lượng nội dung thấp.",
      ok: false
    };
  }

  const priceCheck = validateChapterCoinPrice(config, input.coinPrice);

  if (!priceCheck.ok) {
    return { ok: false, error: priceCheck.error };
  }

  const freeChapters = Math.max(
    config.paidChapterFreeChaptersRequired,
    Math.max(0, Math.floor(input.freeChaptersCount))
  );

  const { data: storyStructure } = await supabase
    .from("stories")
    .select("structure_type")
    .eq("id", input.storyId)
    .maybeSingle();

  if (storyStructure?.structure_type === "standalone") {
    return {
      error: "Truyện một phần chỉ dùng bán trọn bộ, không cấu hình giá từng chương.",
      ok: false
    };
  }

  const { data: episodes, error: episodesError } = await supabase
    .from("episodes")
    .select("id, episode_number, status")
    .eq("story_id", input.storyId)
    .neq("status", "archived")
    .order("episode_number", { ascending: true });

  if (episodesError) {
    return { ok: false, error: episodesError.message };
  }

  if (!episodes?.length) {
    return { ok: false, error: "Truyện chưa có chương để cấu hình." };
  }

  for (const episode of episodes) {
    const episodeNumber = Number(episode.episode_number);
    const isPaid =
      input.monetizationEnabled && episodeNumber > freeChapters;

    const result = await upsertChapterMonetizationSetting({
      chapterId: episode.id,
      storyId: input.storyId,
      creatorUserId: state.user.id,
      isPaid,
      coinPrice: isPaid ? priceCheck.price : null,
      freePreviewEnabled: false,
      freePreviewPercent: null,
      freePreviewChars: null
    });

    if (result.error) {
      return { ok: false, error: result.error };
    }
  }

  revalidatePath(studioPath("/monetization"));
  revalidatePath(studioPath(`/stories/${input.storyId}/chapters`));

  return { ok: true };
}
