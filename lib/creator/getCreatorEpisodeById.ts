import { createClient } from "@/lib/supabase/server";
import { getEpisodePoll } from "@/lib/supabase/polls";
import { getChapterMonetizationSetting } from "@/lib/supabase/chapter-monetization";
import { getChapterEarlyAccessSetting } from "@/lib/supabase/early-access";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorStoryStatus } from "@/lib/creator/getCreatorStories";

export type CreatorEpisodeFormStory = {
  id: string;
  title: string;
  slug: string;
  status: CreatorStoryStatus;
  visibility: "public" | "private";
  genreName: string | null;
  tagNames: string[];
};

export type CreatorEpisodeFormData = {
  story: CreatorEpisodeFormStory | null;
  episode: {
    id: string;
    episode_number: number;
    title: string;
    content: string;
    excerpt: string | null;
    status: CreatorStoryStatus;
    seo_title: string | null;
    seo_description: string | null;
    seo_keywords: string[] | null;
    word_count: number;
    poll: {
      question: string;
      status: "active" | "closed";
      optionTexts: string[];
    } | null;
    monetization: {
      is_paid: boolean;
      coin_price: number | null;
      free_preview_enabled: boolean;
      free_preview_percent: number | null;
      free_preview_chars: number | null;
    } | null;
    early_access: {
      enabled: boolean;
      coin_price: number | null;
      free_at: string | null;
    } | null;
  } | null;
  nextEpisodeNumber: number;
  error: string | null;
};

export async function getCreatorEpisodeFormData(
  creatorProfile: CreatorProfile,
  storyId: string,
  episodeId?: string
): Promise<CreatorEpisodeFormData> {
  try {
    type EpisodeFormEpisode = NonNullable<CreatorEpisodeFormData["episode"]>;
    const supabase = await createClient();
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, title, slug, status, visibility, genre_id, genres(name)")
      .eq("id", storyId)
      .eq("creator_id", creatorProfile.id)
      .maybeSingle();

    if (storyError) {
      throw storyError;
    }

    if (!story) {
      return {
        story: null,
        episode: null,
        nextEpisodeNumber: 1,
        error: null
      };
    }

    const { data: episodeRows, error: episodesError } = await supabase
      .from("episodes")
      .select("episode_number")
      .eq("story_id", story.id)
      .order("episode_number", { ascending: false })
      .limit(1);

    if (episodesError) {
      throw episodesError;
    }

    let episode = null;

    if (episodeId) {
      const { data, error } = await supabase
        .from("episodes")
        .select(
          "id, episode_number, title, content, excerpt, status, word_count, seo_title, seo_description, seo_keywords"
        )
        .eq("id", episodeId)
        .eq("story_id", story.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      episode = data;
    }

    const [poll, monetization, earlyAccess] = episodeId
      ? await Promise.all([
          getEpisodePoll(episodeId, null),
          getChapterMonetizationSetting(episodeId),
          getChapterEarlyAccessSetting(episodeId)
        ])
      : [null, { data: null, error: null }, { data: null, error: null }];

    const { data: storyTagRows } = await supabase
      .from("story_tags")
      .select("tags(name)")
      .eq("story_id", story.id);

    const tagNames = ((storyTagRows ?? []) as Array<{
      tags: { name: string } | { name: string }[] | null;
    }>)
      .map((row) => {
        const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
        return tag?.name ?? "";
      })
      .filter(Boolean);

    const genreRelation = (story as { genres?: { name: string } | { name: string }[] | null })
      .genres;
    const genreName = Array.isArray(genreRelation)
      ? genreRelation[0]?.name ?? null
      : genreRelation?.name ?? null;

      return {
      story: {
        genreName,
        id: story.id,
        slug: story.slug,
        status: story.status as CreatorStoryStatus,
        tagNames,
        title: story.title,
        visibility: story.visibility as "public" | "private"
      } satisfies CreatorEpisodeFormStory,
      episode: episode
        ? {
            ...(episode as EpisodeFormEpisode),
            poll: poll
              ? {
                  question: poll.question,
                  status: poll.status,
                  optionTexts: poll.options.map((option) => option.optionText)
                }
              : null,
            monetization: monetization.data
              ? {
                  is_paid: monetization.data.is_paid,
                  coin_price: monetization.data.coin_price,
                  free_preview_enabled: monetization.data.free_preview_enabled,
                  free_preview_percent: monetization.data.free_preview_percent,
                  free_preview_chars: monetization.data.free_preview_chars
                }
              : null,
            early_access: earlyAccess.data
              ? {
                  enabled: earlyAccess.data.enabled,
                  coin_price: earlyAccess.data.coin_price,
                  free_at: earlyAccess.data.free_at
                }
              : null
          }
        : null,
      nextEpisodeNumber:
        Number(episodeRows?.[0]?.episode_number ?? 0) + (episode ? 0 : 1),
      error: null
    };
  } catch (error) {
    return {
      story: null,
      episode: null,
      nextEpisodeNumber: 1,
      error:
        error instanceof Error ? error.message : "Không thể tải dữ liệu chap."
    };
  }
}
