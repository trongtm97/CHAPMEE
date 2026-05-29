import { createClient } from "@/lib/supabase/server";

type RateLimitKey =
  | "comment"
  | "reply_comment"
  | "story"
  | "chapter"
  | "follow"
  | "save"
  | "report"
  | "tip"
  | "message_request";

const defaultLimits: Record<RateLimitKey, { count: number; windowMs: number }> = {
  comment: { count: 8, windowMs: 60 * 1000 },
  reply_comment: { count: 8, windowMs: 60 * 1000 },
  story: { count: 3, windowMs: 60 * 60 * 1000 },
  chapter: { count: 8, windowMs: 60 * 60 * 1000 },
  follow: { count: 20, windowMs: 60 * 1000 },
  save: { count: 20, windowMs: 60 * 1000 },
  report: { count: 10, windowMs: 24 * 60 * 60 * 1000 },
  tip: { count: 20, windowMs: 24 * 60 * 60 * 1000 },
  message_request: { count: 5, windowMs: 24 * 60 * 60 * 1000 }
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
};

export async function enforceRateLimit(
  key: RateLimitKey,
  userId: string,
  limitOverride?: { count: number; windowMs: number }
): Promise<RateLimitResult> {
  const limit = limitOverride ?? defaultLimits[key];
  const supabase = await createClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - limit.windowMs).toISOString();

  const { count, error } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("limit_key", key)
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if (error) {
    throw error;
  }

  const used = count ?? 0;
  const allowed = used < limit.count;
  const resetAt = new Date(now.getTime() + limit.windowMs).toISOString();

  if (allowed) {
    const { error: insertError } = await supabase.from("rate_limit_events").insert({
      limit_key: key,
      user_id: userId
    });

    if (insertError) {
      throw insertError;
    }
  }

  return {
    allowed,
    remaining: Math.max(limit.count - used - (allowed ? 1 : 0), 0),
    resetAt
  };
}
