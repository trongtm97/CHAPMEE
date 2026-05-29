"use server";

import { createClient } from "@/lib/supabase/server";
import { getQualityMonetizationImpact, getQualityRefundHistory } from "@/lib/admin/get-quality-monetization-impact";
import { calculateQualitySignals } from "@/lib/content-quality/calculate-quality-signals";
import { getAuthorContentQualityDetail } from "@/lib/content-quality/get-author-content-health";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

export async function getContentQualityAdminDetail(storyId: string) {
  const supabase = await createClient();

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select(
      `
      id,
      title,
      slug,
      description,
      creator_id,
      quality_status,
      low_quality_attempt_count,
      monetization_disabled_by_quality,
      monetization_status,
      free_access_set_at,
      creator_profiles (id, user_id, pen_name)
    `
    )
    .eq("id", storyId)
    .maybeSingle();

  if (storyError || !story) {
    return { data: null, error: storyError?.message ?? "Không tìm thấy truyện." };
  }

  const creatorRow = Array.isArray(story.creator_profiles)
    ? story.creator_profiles[0]
    : story.creator_profiles;

  const creatorProfile = {
    id: story.creator_id as string,
    user_id: creatorRow?.user_id as string,
    pen_name: creatorRow?.pen_name as string
  } as CreatorProfile;

  const detail = await getAuthorContentQualityDetail(creatorProfile, storyId);

  const [signals, impactResult, refundHistory] = await Promise.all([
    calculateQualitySignals({
      storyId,
      supabase,
      targetId: storyId,
      targetType: "story"
    }),
    getQualityMonetizationImpact({ storyId }),
    getQualityRefundHistory({ storyId, limit: 5 })
  ]);

  const { data: appeal } = await supabase
    .from("content_quality_appeals")
    .select("*")
    .eq("story_id", storyId)
    .maybeSingle();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, reason, status, created_at")
    .eq("target_type", "story")
    .eq("target_id", storyId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: monetizationRows } = await supabase
    .from("transactions")
    .select(
      "id, created_at, type, creator_net_vnd, platform_fee_vnd, status"
    )
    .eq("story_id", storyId)
    .in("type", ["creator_revenue_share", "chapter_unlock", "author_tip"])
    .order("created_at", { ascending: false })
    .limit(15);

  return {
    data: {
      story: {
        id: story.id as string,
        title: story.title as string,
        slug: story.slug as string | null,
        description: (story.description as string | null) ?? null,
        qualityStatus: story.quality_status,
        attemptCount: Number(story.low_quality_attempt_count ?? 0),
        monetizationDisabled: Boolean(story.monetization_disabled_by_quality)
      },
      author: {
        creatorId: story.creator_id as string,
        userId: creatorRow?.user_id as string,
        penName: creatorRow?.pen_name as string
      },
      detail,
      signals,
      appeal: appeal ?? null,
      reports: reports ?? [],
      monetizationTransactions: monetizationRows ?? [],
      monetizationImpact: impactResult.data,
      refundBatches: refundHistory.batches
    },
    error: null
  };
}
