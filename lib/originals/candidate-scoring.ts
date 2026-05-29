import { createClient } from "@/lib/supabase/server";

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getOriginalsCandidateRecommendations(limit = 20) {
  const supabase = await createClient();
  const [storiesRes, eventsRes, tipsRes, riskRes] = await Promise.all([
    supabase
      .from("stories")
      .select("id, title, slug, creator_profiles(user_id), status")
      .in("status", ["approved", "published"])
      .limit(500),
    supabase
      .from("analytics_events")
      .select("event_name, target_id")
      .in("event_name", ["open_story", "share_clicked", "comment_created", "complete_chap"])
      .limit(10000),
    supabase
      .from("support_tips")
      .select("story_id, coin_amount, status")
      .eq("status", "completed")
      .limit(10000),
    supabase
      .from("risk_events")
      .select("creator_user_id, severity, status")
      .eq("status", "open")
      .in("severity", ["high", "critical"])
      .limit(5000)
  ]);

  const stories = (storiesRes.data ?? []) as Array<{
    id: string;
    title: string;
    slug: string;
    creator_profiles: { user_id: string } | { user_id: string }[] | null;
  }>;
  const events = (eventsRes.data ?? []) as Array<{ event_name: string; target_id: string | null }>;
  const tips = (tipsRes.data ?? []) as Array<{ story_id: string | null; coin_amount: number }>;
  const highRiskCreators = new Set(
    (riskRes.data ?? [])
      .map((row) => row.creator_user_id as string | null)
      .filter(Boolean) as string[]
  );

  const byStory = new Map<
    string,
    {
      opens: number;
      shares: number;
      comments: number;
      completes: number;
      supporterCoin: number;
    }
  >();
  for (const story of stories) {
    byStory.set(story.id, {
      opens: 0,
      shares: 0,
      comments: 0,
      completes: 0,
      supporterCoin: 0
    });
  }
  for (const event of events) {
    if (!event.target_id || !byStory.has(event.target_id)) continue;
    const current = byStory.get(event.target_id)!;
    if (event.event_name === "open_story") current.opens += 1;
    if (event.event_name === "share_clicked") current.shares += 1;
    if (event.event_name === "comment_created") current.comments += 1;
    if (event.event_name === "complete_chap") current.completes += 1;
    byStory.set(event.target_id, current);
  }
  for (const tip of tips) {
    if (!tip.story_id || !byStory.has(tip.story_id)) continue;
    const current = byStory.get(tip.story_id)!;
    current.supporterCoin += num(tip.coin_amount);
    byStory.set(tip.story_id, current);
  }

  const scored = stories.map((story) => {
    const metrics = byStory.get(story.id)!;
    const creator = Array.isArray(story.creator_profiles)
      ? story.creator_profiles[0]
      : story.creator_profiles;
    const creatorUserId = creator?.user_id ?? null;
    const completionRate = metrics.opens > 0 ? metrics.completes / metrics.opens : 0;
    const shareRate = metrics.opens > 0 ? metrics.shares / metrics.opens : 0;
    const commentRate = metrics.opens > 0 ? metrics.comments / metrics.opens : 0;
    const score =
      metrics.opens * 0.2 +
      completionRate * 100 * 1.3 +
      shareRate * 100 * 1.1 +
      commentRate * 100 * 1.0 +
      metrics.supporterCoin * 0.02;
    return {
      storyId: story.id,
      storyTitle: story.title,
      storySlug: story.slug,
      creatorUserId,
      score,
      excludedByRisk: creatorUserId ? highRiskCreators.has(creatorUserId) : true,
      metadata: {
        opens: metrics.opens,
        completion_rate: completionRate,
        share_rate: shareRate,
        comment_rate: commentRate,
        supporter_coin: metrics.supporterCoin
      }
    };
  });

  return scored
    .filter((row) => !row.excludedByRisk)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
