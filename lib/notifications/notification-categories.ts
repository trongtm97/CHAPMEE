import type { NotificationCategory, NotificationType } from "@/types/notification";

const readingTypes = new Set<NotificationType>([
  "new_chapter_from_followed_story",
  "milestone_achieved",
  "story_saved_milestone",
  "became_early_fan",
  "became_top_fan"
]);

const authorTypes = new Set<NotificationType>([
  "new_follower",
  "author_thank_you_sent",
  "top_fan_updated"
]);

const communityTypes = new Set<NotificationType>([
  "author_replied_to_comment",
  "comment_liked_milestone",
  "comment_pinned_by_author",
  "poll_result_updated",
  "challenge_result_announced",
  "challenge_entry_received"
]);

const walletTypes = new Set<NotificationType>([
  "coin_topup_success",
  "coin_mission_reward",
  "chapter_purchase_success",
  "coin_refund",
  "creator_withdrawal_pending",
  "creator_withdrawal_approved",
  "creator_withdrawal_rejected",
  "creator_withdrawal_processing",
  "creator_withdrawal_paid",
  "creator_withdrawal_failed"
]);

const creatorTypes = new Set<NotificationType>([
  "new_comment_on_story",
  "story_reached_reads_milestone",
  "story_approved",
  "story_rejected",
  "creator_tip_received",
  "creator_revenue_received",
  "content_quality_warning",
  "content_quality_needs_fix",
  "content_quality_restored",
  "content_quality_permanently_hidden",
  "content_quality_monetization_disabled",
  "taxonomy_request_approved",
  "taxonomy_request_rejected",
  "taxonomy_request_merged",
  "taxonomy_revision_requested"
]);

const messagesTypes = new Set<NotificationType>([
  "new_message",
  "new_message_request",
  "message_request_accepted",
  "message_report_resolved",
  "message_restriction_applied"
]);

const systemTypes = new Set<NotificationType>([
  "welcome",
  "onboarding_reminder",
  "community_guideline_update",
  "feedback_received",
  "feedback_status_updated"
]);

export function getNotificationCategory(type: NotificationType): NotificationCategory {
  if (readingTypes.has(type)) return "reading";
  if (authorTypes.has(type)) return "author";
  if (communityTypes.has(type)) return "community";
  if (walletTypes.has(type)) return "wallet";
  if (creatorTypes.has(type)) return "creator";
  if (messagesTypes.has(type)) return "messages";
  if (systemTypes.has(type)) return "system";
  return "system";
}

/** Giữ tương thích API cũ */
export function getNotificationGroup(type: NotificationType): "reader" | "author" | "system" {
  const category = getNotificationCategory(type);
  if (category === "reading") return "reader";
  if (category === "author" || category === "creator") return "author";
  return "system";
}
