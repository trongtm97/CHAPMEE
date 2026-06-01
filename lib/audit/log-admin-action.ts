"use server";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";

export type AdminAuditAction =
  | "role_assigned"
  | "role_removed"
  | "role_assignment_expired"
  | "role_permission_viewed"
  | "role_matrix_viewed"
  | "sensitive_role_assigned"
  | "sensitive_role_removed"
  | "user_permission_checked"
  | "assign_role"
  | "remove_role"
  | "ban_user"
  | "unban_user"
  | "approve_story"
  | "reject_story"
  | "remove_content"
  | "update_app_settings"
  | "monetization_settings.update"
  | "adjust_wallet"
  | "approve_payout"
  | "reject_payout"
  | "refund"
  | "delete_report"
  | "moderation_action"
  | "moderation_enforcement"
  | "review_appeal"
  | "correct_age_rating"
  | "report_marked_abuse"
  | "reporter_abuse_enforcement"
  | "quality_status_change"
  | "permanent_hide"
  | "monetization_disable"
  | "payout_paid"
  | "verification_grant"
  | "verification_reject"
  | "verification_revoke"
  | "verification_update"
  | "verification_request_viewed"
  | "verification_approved"
  | "verification_rejected"
  | "verification_needs_more_info"
  | "verification_revoked"
  | "verification_manual_granted"
  | "verification_public_badge_enabled"
  | "verification_public_badge_disabled"
  | "verification_label_changed"
  | "verification_note_added"
  | "username_policy_create"
  | "username_policy_update"
  | "username_policy_rule_disabled"
  | "username_policy_rule_enabled"
  | "username_policy_rule_archived"
  | "username_policy_imported"
  | "username_policy_exception_created"
  | "username_policy_exception_revoked"
  | "username_manual_assigned"
  | "username_conflict_resolved"
  | "username_change_requested"
  | "coin_grant"
  | "coin_debit"
  | "creator_fee_policy_create"
  | "creator_fee_policy_update"
  | "creator_fee_policy_disable"
  | "admin_user_create"
  | "approve_content"
  | "reject_content"
  | "request_content_changes"
  | "send_to_quality_review"
  | "report_assigned"
  | "report_rejected"
  | "report_resolved"
  | "report_escalated"
  | "reported_content_hidden"
  | "reported_content_restored"
  | "reported_user_warned"
  | "reported_user_restricted"
  | "report_severity_changed"
  | "quality_content_set_free"
  | "quality_content_paid_restored"
  | "quality_refund_preview_created"
  | "quality_coin_refund_confirmed"
  | "quality_coin_refund_item_created"
  | "quality_creator_revenue_reversed"
  | "quality_refund_failed"
  | "quality_refund_cancelled"
  | "creator_monetization_approve"
  | "creator_monetization_reject"
  | "creator_monetization_suspend"
  | "creator_monetization_restore"
  | "creator_monetization_permanent_disable"
  | "creator_monetization_disabled"
  | "creator_monetization_enabled"
  | "creator_withdrawal_disabled"
  | "creator_withdrawal_enabled"
  | "creator_revenue_share_update"
  | "creator_payout_enable"
  | "creator_payout_disable"
  | "creator_studio_suspend"
  | "creator_studio_unlock"
  | "creator_override_update"
  | "campaign_create"
  | "campaign_update"
  | "campaign_activate"
  | "campaign_pause"
  | "campaign_end"
  | "campaign_archive"
  | "campaign_settings_update"
  | "sponsor_create"
  | "sponsor_update"
  | "approve_story_completion"
  | "reject_story_completion"
  | "taxonomy_quality_check_run"
  | "taxonomy_quality_flag_dismissed"
  | "taxonomy_quality_flag_resolved"
  | "taxonomy_quality_admin_edit_taxonomy"
  | "taxonomy_quality_revision_requested"
  | "taxonomy_quality_revision_approved"
  | "taxonomy_quality_revision_rejected"
  | "taxonomy_quality_revision_submitted"
  | "taxonomy_quality_rule_updated"
  | "taxonomy_quality_flag_manual_created";

export type LogAdminActionInput = {
  actorId: string;
  action: AdminAuditAction | string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function logAdminAction(input: LogAdminActionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null
  });

  if (error) {
    if (isMissingSchemaError(error)) {
      return { ok: false, error: null };
    }
    if (process.env.NODE_ENV === "development") {
      console.warn("[audit] logAdminAction:", error.message);
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}
