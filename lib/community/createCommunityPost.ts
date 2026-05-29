"use server";

import { redirect } from "next/navigation";
import { calculateUserTrustScore } from "@/lib/community/calculate-user-trust-score";
import {
  getActiveKeywordRules,
  getAutoModerationSettings
} from "@/lib/community/get-auto-moderation-settings";
import {
  mapDecisionToPostFields,
  runAutoModeration
} from "@/lib/community/run-auto-moderation";
import { saveModerationDecision } from "@/lib/community/save-moderation-decision";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { createClient } from "@/lib/supabase/server";

export type CommunityPostFormState = {
  error: string | null;
  success: string | null;
};

const allowedTypes = new Set([
  "discussion",
  "review",
  "poll_placeholder",
  "challenge"
]);

function isMissingAuthSession(errorMessage: string) {
  return errorMessage.toLowerCase().includes("auth session missing");
}

export async function createCommunityPostAction(
  _previousState: CommunityPostFormState,
  formData: FormData
): Promise<CommunityPostFormState> {
  const type = String(formData.get("type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const storyId = String(formData.get("story_id") ?? "").trim();

  if (!allowedTypes.has(type)) {
    return { error: "Vui lòng chọn loại bài cộng đồng.", success: null };
  }

  if (!title) {
    return { error: "Vui lòng nhập tiêu đề.", success: null };
  }

  if (!content) {
    return { error: "Vui lòng nhập nội dung.", success: null };
  }

  if (content.length > 5000) {
    return { error: "Nội dung tối đa 5000 ký tự.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError && !isMissingAuthSession(userError.message)) {
    return { error: userError.message, success: null };
  }

  if (!user) {
    redirect("/login?next=/community/new");
  }

  try {
    await assertActionAccess("community.post.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const postCheck = await assertNotRestricted(
    user.id,
    "post_block",
    "Bạn đang bị hạn chế đăng bài cộng đồng."
  );
  if (!postCheck.ok) {
    return { error: postCheck.error, success: null };
  }

  const emailVerified = Boolean(
    user.email_confirmed_at ?? user.confirmed_at
  );

  const [settings, keywordRules, trust] = await Promise.all([
    getAutoModerationSettings(),
    getActiveKeywordRules(),
    calculateUserTrustScore(user.id, { emailVerified })
  ]);

  const moderation = await runAutoModeration({
    userId: user.id,
    title,
    content,
    postType: type,
    storyId: storyId || null,
    settings,
    keywordRules,
    trust
  });

  const postFields = mapDecisionToPostFields(moderation);

  const { data: inserted, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id,
      type,
      title,
      content,
      story_id: storyId || null,
      creator_id: null,
      ...postFields
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message, success: null };
  }

  if (inserted?.id) {
    await saveModerationDecision(user.id, inserted.id as string, moderation);
  }

  if (moderation.decision === "auto_rejected" || moderation.decision === "auto_hidden") {
    return { error: moderation.userMessage, success: null };
  }

  if (moderation.decision === "rate_limited") {
    return { error: moderation.userMessage, success: null };
  }

  return {
    error: null,
    success: moderation.userMessage
  };
}
