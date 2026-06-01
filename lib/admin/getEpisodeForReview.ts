import { ADMIN_CREATOR_JOIN, resolveAdminCreatorName } from "@/lib/admin/creator-display";
import { createClient } from "@/lib/supabase/server";

export type EpisodeForReview = {
  id: string;
  storyId: string;
  storyTitle: string;
  episodeNumber: number;
  title: string;
  content: string;
  excerpt: string | null;
  wordCount: number;
  creatorName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type EpisodeForReviewResult = {
  episode: EpisodeForReview | null;
  notFound: boolean;
  error: string | null;
};

type EpisodeRow = {
  id: string;
  story_id: string;
  episode_number: number;
  title: string;
  content: string;
  excerpt: string | null;
  word_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  stories:
    | {
        title: string | null;
        creator_profiles: unknown;
      }
    | Array<{
        title: string | null;
        creator_profiles: unknown;
      }>
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getEpisodeForReview(
  episodeId: string
): Promise<EpisodeForReviewResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("episodes")
      .select(
        `id, story_id, episode_number, title, content, excerpt, word_count, status, created_at, updated_at, published_at, stories(title, ${ADMIN_CREATOR_JOIN})`
      )
      .eq("id", episodeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return { episode: null, notFound: true, error: null };
    }

    const episode = data as unknown as EpisodeRow;
    const story = firstRelation(episode.stories);
    const creator = firstRelation(story?.creator_profiles);

    return {
      error: null,
      notFound: false,
      episode: {
        id: episode.id,
        storyId: episode.story_id,
        storyTitle: story?.title ?? "Không rõ truyện",
        episodeNumber: episode.episode_number,
        title: episode.title,
        content: episode.content,
        excerpt: episode.excerpt,
        wordCount: episode.word_count,
        creatorName: resolveAdminCreatorName(creator),
        status: episode.status,
        createdAt: episode.created_at,
        updatedAt: episode.updated_at,
        publishedAt: episode.published_at
      }
    };
  } catch (error) {
    return {
      episode: null,
      notFound: false,
      error:
        error instanceof Error ? error.message : "Không thể tải chap review."
    };
  }
}
