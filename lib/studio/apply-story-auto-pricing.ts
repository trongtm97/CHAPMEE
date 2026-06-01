import { upsertChapterMonetizationSetting } from "@/lib/supabase/chapter-monetization";
import { createClient } from "@/lib/supabase/server";
import type { ChapterPricingSource, StoryMonetizationSettings } from "@/types/story-monetization";

type EpisodeRow = {
  id: string;
  episode_number: number;
  status: string;
};

function resolveChapterPricing(input: {
  episodeNumber: number;
  settings: StoryMonetizationSettings;
  existingOverride: boolean;
  forceOverride: boolean;
}): {
  isPaid: boolean;
  coinPrice: number | null;
  pricingSource: ChapterPricingSource;
  monetizationOverride: boolean;
} {
  if (!input.settings.auto_pricing_enabled || !input.settings.monetization_enabled) {
    return {
      isPaid: false,
      coinPrice: null,
      pricingSource: "free_manual",
      monetizationOverride: false
    };
  }

  const freeCount = Math.max(0, input.settings.free_first_chapters_count);
  const paidFrom =
    input.settings.auto_paid_from_chapter ??
    freeCount + 1;

  if (input.episodeNumber <= freeCount) {
    return {
      isPaid: false,
      coinPrice: null,
      pricingSource: "auto_free_first_chapters",
      monetizationOverride: false
    };
  }

  if (input.episodeNumber < paidFrom) {
    return {
      isPaid: false,
      coinPrice: null,
      pricingSource: "auto_free_first_chapters",
      monetizationOverride: false
    };
  }

  return {
    isPaid: true,
    coinPrice: input.settings.auto_price_coin,
    pricingSource: "auto_paid_after_threshold",
    monetizationOverride: false
  };
}

export async function applyStoryAutoPricing(input: {
  storyId: string;
  creatorUserId: string;
  settings: StoryMonetizationSettings;
  applyToExisting: boolean;
  overwriteOverrides: boolean;
  chapterIds?: string[];
}) {
  const supabase = await createClient();

  let episodesQuery = supabase
    .from("episodes")
    .select("id, episode_number, status")
    .eq("story_id", input.storyId)
    .neq("status", "archived")
    .order("episode_number", { ascending: true });

  if (input.chapterIds?.length) {
    episodesQuery = episodesQuery.in("id", input.chapterIds);
  }

  const { data: episodes, error: episodesError } = await episodesQuery;

  if (episodesError) {
    return { ok: false as const, error: episodesError.message, updatedCount: 0 };
  }

  if (!episodes?.length) {
    return { ok: false as const, error: "Truyện chưa có chương.", updatedCount: 0 };
  }

  const episodeRows = episodes as EpisodeRow[];
  const episodeIds = episodeRows.map((row) => row.id);

  const { data: existingSettings } = await supabase
    .from("chapter_monetization_settings")
    .select("chapter_id, monetization_override")
    .eq("story_id", input.storyId)
    .in("chapter_id", episodeIds);

  const overrideMap = new Map(
    (existingSettings ?? []).map((row) => [
      row.chapter_id as string,
      Boolean(row.monetization_override)
    ])
  );

  let updatedCount = 0;

  for (const episode of episodeRows) {
    const episodeNumber = Number(episode.episode_number);
    const hasOverride = overrideMap.get(episode.id) ?? false;

    if (hasOverride && !input.overwriteOverrides) {
      continue;
    }

    if (!input.applyToExisting && hasOverride) {
      continue;
    }

    const pricing = resolveChapterPricing({
      episodeNumber,
      settings: input.settings,
      existingOverride: hasOverride,
      forceOverride: input.overwriteOverrides
    });

    if (!input.settings.auto_pricing_enabled) {
      continue;
    }

    const result = await upsertChapterMonetizationSetting({
      chapterId: episode.id,
      storyId: input.storyId,
      creatorUserId: input.creatorUserId,
      isPaid: pricing.isPaid,
      coinPrice: pricing.coinPrice,
      freePreviewEnabled: false,
      freePreviewPercent: null,
      freePreviewChars: null,
      pricingSource: pricing.pricingSource,
      monetizationOverride: pricing.monetizationOverride
    });

    if (result.error) {
      return { ok: false as const, error: result.error, updatedCount };
    }

    updatedCount += 1;
  }

  return { ok: true as const, updatedCount, error: null };
}
