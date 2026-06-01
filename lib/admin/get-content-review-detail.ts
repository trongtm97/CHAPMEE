"use server";

import { ADMIN_CREATOR_JOIN, resolveAdminCreatorName } from "@/lib/admin/creator-display";
import { createClient } from "@/lib/supabase/server";
import type { ContentReviewDetail, ContentReviewQueueItem } from "@/types/admin-content-review";

function firstRelation<T>(relation: unknown): T | null {
  if (relation == null) return null;
  return Array.isArray(relation) ? ((relation[0] as T) ?? null) : (relation as T);
}

function buildChecklist(input: {
  title: string;
  excerpt: string | null;
  genreName: string | null;
  coverUrl: string | null;
  wordCount: number | null;
  type: string;
}) {
  const hasTitle = input.title.trim().length > 0;
  const hasDesc = Boolean(input.excerpt?.trim());
  const hasGenre = Boolean(input.genreName);
  const hasCover = Boolean(input.coverUrl);
  const longEnough =
    input.type === "episode"
      ? (input.wordCount ?? 0) >= 200
      : (input.excerpt?.length ?? 0) >= 40;

  return [
    { id: "title", label: "Có tiêu đề", passed: hasTitle },
    { id: "description", label: "Có mô tả/nội dung", passed: hasDesc },
    { id: "genre", label: "Có thể loại (nếu là truyện)", passed: input.type !== "story" || hasGenre },
    { id: "cover", label: "Có ảnh bìa (nếu là truyện)", passed: input.type !== "story" || hasCover },
    { id: "length", label: "Độ dài tối thiểu", passed: longEnough }
  ];
}

export async function getContentReviewDetail(
  item: ContentReviewQueueItem
): Promise<{ detail: ContentReviewDetail | null; error: string | null }> {
  const supabase = await createClient();

  try {
    if (item.type === "story") {
      const { data, error } = await supabase
        .from("stories")
        .select(
          `id, title, slug, hook, short_description, long_description, cover_url, visibility, status, ${ADMIN_CREATOR_JOIN}`
        )
        .eq("id", item.id)
        .maybeSingle();

      if (error || !data) {
        return { detail: null, error: error?.message ?? "Không tìm thấy truyện." };
      }

      const creator = firstRelation<{
        user_id: string;
        profiles: {
          username: string | null;
          display_name: string | null;
          is_verified: boolean;
        } | null;
      }>(data.creator_profiles);
      const profile = firstRelation<{
        username: string | null;
        display_name: string | null;
        is_verified: boolean;
      }>(creator?.profiles);
      const author = await loadAuthorStats(supabase, creator?.user_id ?? null);

      const detail: ContentReviewDetail = {
        item: {
          ...item,
          creatorName:
            resolveAdminCreatorName(creator) ?? item.creatorName,
          creatorUsername: profile?.username ?? item.creatorUsername
        },
        hook: data.hook as string | null,
        longDescription: data.long_description as string | null,
        contentPreview: null,
        visibility: data.visibility as string,
        tags: [],
        author,
        checklist: buildChecklist({
          title: data.title as string,
          excerpt: (data.hook as string) ?? (data.short_description as string),
          genreName: item.genreName,
          coverUrl: data.cover_url as string | null,
          wordCount: null,
          type: "story"
        }),
        publicPreviewUrl:
          data.status === "approved" || data.status === "published"
            ? `/stories/${data.slug}`
            : null
      };

      return { detail, error: null };
    }

    if (item.type === "episode") {
      const { data, error } = await supabase
        .from("episodes")
        .select("id, title, excerpt, content, word_count, status, story_id, stories(slug, title)")
        .eq("id", item.id)
        .maybeSingle();

      if (error || !data) {
        return { detail: null, error: error?.message ?? "Không tìm thấy chương." };
      }

      const story = firstRelation<{ slug: string | null; title: string | null }>(data.stories);
      const content = (data.content as string | null) ?? "";
      const preview = content.slice(0, 1200);

      const detail: ContentReviewDetail = {
        item,
        hook: null,
        longDescription: null,
        contentPreview: preview || data.excerpt,
        visibility: null,
        tags: [],
        author: {
          publishedStories: 0,
          rejectedCount: 0,
          recentReports: 0,
          creatorStatus: null,
          isVerified: false
        },
        checklist: buildChecklist({
          title: data.title as string,
          excerpt: data.excerpt as string | null,
          genreName: item.genreName,
          coverUrl: null,
          wordCount: data.word_count as number,
          type: "episode"
        }),
        publicPreviewUrl: story?.slug ? `/stories/${story.slug}` : null
      };

      return { detail, error: null };
    }

    if (item.type === "community_post") {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, title, content, status")
        .eq("id", item.id)
        .maybeSingle();

      if (error || !data) {
        return { detail: null, error: error?.message ?? "Không tìm thấy bài đăng." };
      }

      return {
        detail: {
          item,
          hook: null,
          longDescription: null,
          contentPreview: data.content as string,
          visibility: null,
          tags: [],
          author: {
            publishedStories: 0,
            rejectedCount: 0,
            recentReports: 0,
            creatorStatus: null,
            isVerified: false
          },
          checklist: buildChecklist({
            title: data.title as string,
            excerpt: data.content as string,
            genreName: null,
            coverUrl: null,
            wordCount: null,
            type: "community_post"
          }),
          publicPreviewUrl: "/community"
        },
        error: null
      };
    }

    if (item.type === "comment") {
      const { data, error } = await supabase
        .from("comments")
        .select("id, body, status")
        .eq("id", item.id)
        .maybeSingle();

      if (error || !data) {
        return { detail: null, error: error?.message ?? "Không tìm thấy bình luận." };
      }

      return {
        detail: {
          item,
          hook: null,
          longDescription: null,
          contentPreview: data.body as string,
          visibility: null,
          tags: [],
          author: {
            publishedStories: 0,
            rejectedCount: 0,
            recentReports: 0,
            creatorStatus: null,
            isVerified: false
          },
          checklist: buildChecklist({
            title: "Bình luận",
            excerpt: data.body as string,
            genreName: null,
            coverUrl: null,
            wordCount: (data.body as string).length,
            type: "comment"
          }),
          publicPreviewUrl: null
        },
        error: null
      };
    }

    return { detail: null, error: "Loại nội dung không hỗ trợ." };
  } catch (error) {
    return {
      detail: null,
      error: error instanceof Error ? error.message : "Không tải được chi tiết."
    };
  }
}

async function loadAuthorStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null
) {
  if (!userId) {
    return {
      publishedStories: 0,
      rejectedCount: 0,
      recentReports: 0,
      creatorStatus: null,
      isVerified: false
    };
  }

  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("id, status, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const creatorId = creator?.id as string | undefined;

  const [publishedRes, rejectedRes, reportsRes, profileRes] = await Promise.all([
    creatorId
      ? supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .in("status", ["approved", "published"])
      : Promise.resolve({ count: 0, error: null }),
    creatorId
      ? supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .eq("status", "rejected")
      : Promise.resolve({ count: 0, error: null }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "user")
      .eq("target_id", userId)
      .in("status", ["open", "reviewing"]),
    supabase.from("profiles").select("is_verified").eq("id", userId).maybeSingle()
  ]);

  return {
    publishedStories: publishedRes.count ?? 0,
    rejectedCount: rejectedRes.count ?? 0,
    recentReports: reportsRes.count ?? 0,
    creatorStatus: (creator?.status as string) ?? null,
    isVerified: Boolean(profileRes.data?.is_verified)
  };
}
