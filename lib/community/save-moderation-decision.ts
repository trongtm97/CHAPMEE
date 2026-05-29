import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { AutoModerationResult } from "@/types/community-auto-moderation";

export async function saveModerationDecision(
  userId: string,
  postId: string,
  result: AutoModerationResult
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_moderation_decisions")
    .insert({
      post_id: postId,
      user_id: userId,
      decision: result.decision,
      trust_score: result.trustScore,
      matched_rules: result.matchedRules,
      reason_codes: result.reasonCodes,
      final_status: result.postStatus
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    return null;
  }

  const decisionId = data?.id as string | undefined;
  if (decisionId) {
    await supabase
      .from("community_posts")
      .update({ latest_moderation_decision_id: decisionId })
      .eq("id", postId);
  }

  return decisionId ?? null;
}
