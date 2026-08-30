import { createClient } from "@/lib/data/server";

/** Tài khoản có ít hoạt động tin cậy → giới hạn yêu cầu tin nhắn thấp hơn. */
export async function hasTrustedAccountActivity(userId: string): Promise<boolean> {
  const db = await createClient();

  const [
    comments,
    follows,
    userFollows
  ] = await Promise.all([
    db
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    db
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    db
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId)
  ]);

  const activityScore =
    (comments.count ?? 0) + (follows.count ?? 0) + (userFollows.count ?? 0);

  return activityScore >= 1;
}
