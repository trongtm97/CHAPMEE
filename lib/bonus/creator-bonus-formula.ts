import { createClient } from "@/lib/supabase/server";

type BonusWeights = {
  unique_readers: number;
  chapter_completion_rate: number;
  read_more_rate: number;
  saves: number;
  comments_quality_score: number;
  shares: number;
  follower_growth: number;
  paid_reader_count: number;
  consistency_chapters_published: number;
  penalty_moderation_flags: number;
  penalty_refund_rate: number;
  penalty_ai_spam_flags: number;
  penalty_fraud_risk: number;
};

export const DEFAULT_BONUS_WEIGHTS: BonusWeights = {
  unique_readers: 1.1,
  chapter_completion_rate: 1.2,
  read_more_rate: 1.0,
  saves: 1.0,
  comments_quality_score: 0.9,
  shares: 0.7,
  follower_growth: 0.9,
  paid_reader_count: 1.2,
  consistency_chapters_published: 0.8,
  penalty_moderation_flags: 1.0,
  penalty_refund_rate: 0.7,
  penalty_ai_spam_flags: 1.2,
  penalty_fraud_risk: 1.4
};

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeBonusWeights(input?: Record<string, unknown>): BonusWeights {
  return {
    unique_readers: num(input?.unique_readers) || DEFAULT_BONUS_WEIGHTS.unique_readers,
    chapter_completion_rate:
      num(input?.chapter_completion_rate) || DEFAULT_BONUS_WEIGHTS.chapter_completion_rate,
    read_more_rate: num(input?.read_more_rate) || DEFAULT_BONUS_WEIGHTS.read_more_rate,
    saves: num(input?.saves) || DEFAULT_BONUS_WEIGHTS.saves,
    comments_quality_score:
      num(input?.comments_quality_score) || DEFAULT_BONUS_WEIGHTS.comments_quality_score,
    shares: num(input?.shares) || DEFAULT_BONUS_WEIGHTS.shares,
    follower_growth: num(input?.follower_growth) || DEFAULT_BONUS_WEIGHTS.follower_growth,
    paid_reader_count: num(input?.paid_reader_count) || DEFAULT_BONUS_WEIGHTS.paid_reader_count,
    consistency_chapters_published:
      num(input?.consistency_chapters_published) ||
      DEFAULT_BONUS_WEIGHTS.consistency_chapters_published,
    penalty_moderation_flags:
      num(input?.penalty_moderation_flags) || DEFAULT_BONUS_WEIGHTS.penalty_moderation_flags,
    penalty_refund_rate:
      num(input?.penalty_refund_rate) || DEFAULT_BONUS_WEIGHTS.penalty_refund_rate,
    penalty_ai_spam_flags:
      num(input?.penalty_ai_spam_flags) || DEFAULT_BONUS_WEIGHTS.penalty_ai_spam_flags,
    penalty_fraud_risk:
      num(input?.penalty_fraud_risk) || DEFAULT_BONUS_WEIGHTS.penalty_fraud_risk
  };
}

export async function calculateCreatorBonusCandidates(input: {
  periodStart: string;
  periodEnd: string;
  weights?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const weights = normalizeBonusWeights(input.weights);

  const [profilesRes, eventsRes, commentsRes, savesRes, followersRes, txRes] = await Promise.all([
    supabase
      .from("creator_monetization_profiles")
      .select("user_id, status, monetization_enabled")
      .eq("status", "approved")
      .eq("monetization_enabled", true),
    supabase
      .from("analytics_events")
      .select("event_name, target_id, user_id")
      .gte("created_at", input.periodStart)
      .lte("created_at", input.periodEnd),
    supabase
      .from("comments")
      .select("id, author_id, story_id")
      .eq("status", "visible")
      .gte("created_at", input.periodStart)
      .lte("created_at", input.periodEnd),
    supabase
      .from("bookshelf_items")
      .select("id, story_id")
      .eq("status", "saved")
      .gte("created_at", input.periodStart)
      .lte("created_at", input.periodEnd),
    supabase
      .from("follows")
      .select("id, creator_id")
      .gte("created_at", input.periodStart)
      .lte("created_at", input.periodEnd),
    supabase
      .from("transactions")
      .select("creator_user_id, user_id, type, status, money_amount_vnd, metadata")
      .eq("status", "completed")
      .gte("created_at", input.periodStart)
      .lte("created_at", input.periodEnd)
  ]);

  const creators = ((profilesRes.data ?? []) as Array<{ user_id: string }>).map((p) => p.user_id);
  const eventRows = (eventsRes.data ?? []) as Array<{
    event_name: string;
    target_id: string | null;
    user_id: string | null;
  }>;
  const comments = commentsRes.data ?? [];
  const saves = savesRes.data ?? [];
  const followers = followersRes.data ?? [];
  const txs = (txRes.data ?? []) as Array<{
    creator_user_id: string | null;
    user_id: string | null;
    type: string;
    status: string;
    money_amount_vnd: number | null;
    metadata: Record<string, unknown> | null;
  }>;

  const rows: Array<{
    creatorUserId: string;
    score: number;
    metadata: Record<string, unknown>;
  }> = [];

  for (const creatorUserId of creators) {
    const creatorTx = txs.filter((tx) => tx.creator_user_id === creatorUserId);
    const paidReaderCount = new Set(
      creatorTx
        .filter((tx) => ["author_tip", "virtual_gift", "chapter_unlock"].includes(tx.type))
        .map((tx) => tx.user_id)
        .filter(Boolean) as string[]
    ).size;
    const gross = creatorTx.reduce((sum, tx) => sum + num(tx.money_amount_vnd), 0);

    const uniqueReaders = new Set(
      eventRows
        .filter((event) => event.event_name === "open_story" && event.user_id)
        .map((event) => event.user_id as string)
    ).size;
    const chapterStarts = eventRows.filter((event) => event.event_name === "start_reading").length;
    const chapterCompletes = eventRows.filter((event) => event.event_name === "complete_chap").length;
    const readMore = eventRows.filter((event) => ["feed_read_more", "reels_read_more_clicked"].includes(event.event_name)).length;
    const shares = eventRows.filter((event) => event.event_name === "share_clicked").length;
    const completionRate = chapterStarts > 0 ? chapterCompletes / chapterStarts : 0;
    const readMoreRate = chapterStarts > 0 ? readMore / chapterStarts : 0;
    const savesCount = saves.length;
    const commentsQualityScore = comments.length * 0.7;
    const followerGrowth = followers.filter((row) => row.creator_id != null).length;
    const consistency = Math.min(30, chapterStarts > 0 ? chapterStarts / 5 : 0);

    const riskPenalty = 0;
    const moderationPenalty = 0;
    const refundPenalty = 0;
    const aiSpamPenalty = 0;

    const score =
      uniqueReaders * weights.unique_readers +
      completionRate * 100 * weights.chapter_completion_rate +
      readMoreRate * 100 * weights.read_more_rate +
      savesCount * weights.saves +
      commentsQualityScore * weights.comments_quality_score +
      shares * weights.shares +
      followerGrowth * weights.follower_growth +
      paidReaderCount * weights.paid_reader_count +
      consistency * weights.consistency_chapters_published -
      moderationPenalty * weights.penalty_moderation_flags -
      refundPenalty * weights.penalty_refund_rate -
      aiSpamPenalty * weights.penalty_ai_spam_flags -
      riskPenalty * weights.penalty_fraud_risk;

    if (score <= 0 || gross <= 0) {
      continue;
    }
    rows.push({
      creatorUserId,
      score,
      metadata: {
        unique_readers: uniqueReaders,
        completion_rate: completionRate,
        read_more_rate: readMoreRate,
        saves: savesCount,
        comments_quality_score: commentsQualityScore,
        shares,
        follower_growth: followerGrowth,
        paid_reader_count: paidReaderCount,
        consistency_chapters_published: consistency,
        gross_revenue_vnd: gross
      }
    });
  }

  return rows.sort((a, b) => b.score - a.score);
}
