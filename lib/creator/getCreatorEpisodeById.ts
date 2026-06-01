import { resolveEffectivePresentationMode } from "@/lib/presentation/resolve-mode";
import { stringifyStructuredTemplate } from "@/lib/presentation/template-json";
import {
  getPresentationTemplates,
  getStoryPresentationSettings
} from "@/lib/taxonomy/presentation";
import { loadStoryCatalogDisplayLabels } from "@/lib/taxonomy/story-genre-labels";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { PresentationMode } from "@/types/presentation";
import { getEpisodePoll } from "@/lib/supabase/polls";
import { getChapterMonetizationSetting } from "@/lib/supabase/chapter-monetization";
import { getChapterEarlyAccessSetting } from "@/lib/supabase/early-access";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorStoryStatus } from "@/lib/creator/getCreatorStories";

export type CreatorEpisodeFormStory = {
  id: string;
  title: string;
  slug: string;
  publicCode: string | null;
  status: CreatorStoryStatus;
  visibility: "public" | "private";
  genreName: string | null;
  tagNames: string[];
  presentationMode: PresentationMode;
  formatTemplateExampleJson: string | null;
  contentWarningsConfirmed: boolean;
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
    presentation_mode: string | null;
    structured_content: unknown | null;
    content_format: string | null;
    composer_version: number | null;
    validation_status: string | null;
    validation_errors: Array<{
      code: string;
      message: string;
      blockId?: string;
      severity: "error" | "warning";
    }> | null;
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
      .select("id, title, slug, public_code, status, visibility, content_warnings_confirmed")
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
      const episodeSelectFull =
        "id, episode_number, title, content, excerpt, status, word_count, seo_title, seo_description, seo_keywords, presentation_mode, structured_content, content_format, composer_version, validation_status, validation_errors";
      const episodeSelectLegacy =
        "id, episode_number, title, content, excerpt, status, word_count, seo_title, seo_description, seo_keywords, presentation_mode, structured_content, content_format";

      let episodeResult = await supabase
        .from("episodes")
        .select(episodeSelectFull)
        .eq("id", episodeId)
        .eq("story_id", story.id)
        .maybeSingle();

      if (episodeResult.error && isMissingSchemaError(episodeResult.error)) {
        episodeResult = await supabase
          .from("episodes")
          .select(episodeSelectLegacy)
          .eq("id", episodeId)
          .eq("story_id", story.id)
          .maybeSingle();
      }

      if (episodeResult.error) {
        throw episodeResult.error;
      }

      episode = episodeResult.data;
    }

    const [poll, monetization, earlyAccess] = episodeId
      ? await Promise.all([
          getEpisodePoll(episodeId, null),
          getChapterMonetizationSetting(episodeId),
          getChapterEarlyAccessSetting(episodeId)
        ])
      : [null, { data: null, error: null }, { data: null, error: null }];

    const catalogDisplay = await loadStoryCatalogDisplayLabels(supabase, story.id);
    const genreName = catalogDisplay.genreName;
    const tagNames = catalogDisplay.tagNames;

    const presentationSettings = await getStoryPresentationSettings(story.id);
    const presentationMode = resolveEffectivePresentationMode({
      storyMode: presentationSettings.data?.mode ?? null
    });

    let formatTemplateExampleJson: string | null = null;
    const templateId = presentationSettings.data?.template_id;
    if (templateId) {
      const templates = await getPresentationTemplates(presentationMode);
      const match = templates.data.find((row) => row.id === templateId);
      if (match?.example_json && Object.keys(match.example_json).length > 0) {
        formatTemplateExampleJson = stringifyStructuredTemplate(
          presentationMode,
          match.example_json
        );
      }
    }

      return {
      story: {
        genreName,
        id: story.id,
        publicCode: (story as { public_code?: string | null }).public_code ?? null,
        slug: story.slug,
        status: story.status as CreatorStoryStatus,
        tagNames,
        title: story.title,
        visibility: story.visibility as "public" | "private",
        presentationMode,
        formatTemplateExampleJson,
        contentWarningsConfirmed: Boolean(
          (story as { content_warnings_confirmed?: boolean }).content_warnings_confirmed
        )
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
