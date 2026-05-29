import { createClient } from "@/lib/supabase/server";

/** Tài khoản có ít hoạt động tin cậy → giới hạn yêu cầu tin nhắn thấp hơn. */
export async function hasTrustedAccountActivity(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const [
    comments,
    follows,
    userFollows
  ] = await Promise.all([
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId)
  ]);

  const activityScore =
    (comments.count ?? 0) + (follows.count ?? 0) + (userFollows.count ?? 0);

  return activityScore >= 1;
}
