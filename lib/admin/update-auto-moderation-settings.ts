"use server";

import { revalidatePath } from "next/cache";
import { assertStaffAnyPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createClient } from "@/lib/supabase/server";
import type { CommunityAutoModerationSettings } from "@/types/community-auto-moderation";

export async function updateAutoModerationSettingsAction(
  settings: CommunityAutoModerationSettings
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { userId } = await assertStaffAnyPermission(["admin.settings.update"]);
    const supabase = await createClient();

    const row = {
      enabled: settings.enabled,
      mode: settings.mode,
      auto_approve_min_trust_score: settings.autoApproveMinTrustScore,
      trusted_author_min_score: settings.trustedAuthorMinScore,
      prioritize_verified_authors: settings.prioritizeVerifiedAuthors,
      require_email_verified: settings.requireEmailVerified,
      require_no_active_strikes: settings.requireNoActiveStrikes,
      max_rejected_posts_30d: settings.maxRejectedPosts30d,
      max_valid_reports_30d: settings.maxValidReports30d,
      allow_external_links_for_trusted: settings.allowExternalLinksForTrusted,
      review_external_links: settings.reviewExternalLinks,
      auto_reject_blocked_keywords: settings.autoRejectBlockedKeywords,
      review_new_accounts: settings.reviewNewAccounts,
      new_account_days: settings.newAccountDays,
      min_post_length: settings.minPostLength,
      max_post_length: settings.maxPostLength,
      min_approved_posts_for_auto: settings.minApprovedPostsForAuto,
      rate_limits: settings.rateLimits,
      allowed_domains: settings.allowedDomains,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
      .from("community_auto_moderation_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const { error } = existing?.id
      ? await supabase
          .from("community_auto_moderation_settings")
          .update(row)
          .eq("id", existing.id as string)
      : await supabase.from("community_auto_moderation_settings").insert(row);

    if (error) return { ok: false, error: error.message };

    await logAdminAction({
      actorId: userId,
      action: "community_spam_rule_updated",
      targetType: "community_auto_moderation_settings",
      targetId: existing?.id ? String(existing.id) : "new",
      metadata: { enabled: settings.enabled, mode: settings.mode }
    });

    revalidatePath("/admin/community/auto-moderation");
    revalidatePath("/admin/community");
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không lưu được cấu hình."
    };
  }
}
