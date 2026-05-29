export const notificationTypes = [
  "new_chapter_from_followed_story",
  "author_replied_to_comment",
  "comment_liked_milestone",
  "comment_pinned_by_author",
  "became_early_fan",
  "became_top_fan",
  "poll_result_updated",
  "challenge_result_announced",
  "milestone_achieved",
  "new_comment_on_story",
  "story_reached_reads_milestone",
  "new_follower",
  "story_saved_milestone",
  "top_fan_updated",
  "challenge_entry_received",
  "author_thank_you_sent",
  "welcome",
  "onboarding_reminder",
  "community_guideline_update",
  "coin_topup_success",
  "coin_mission_reward",
  "chapter_purchase_success",
  "coin_refund",
  "creator_withdrawal_pending",
  "creator_withdrawal_approved",
  "creator_withdrawal_rejected",
  "creator_withdrawal_processing",
  "creator_withdrawal_paid",
  "creator_withdrawal_failed",
  "story_approved",
  "story_rejected",
  "creator_tip_received",
  "creator_revenue_received",
  "new_message",
  "new_message_request",
  "message_request_accepted",
  "message_report_resolved",
  "message_restriction_applied",
  "schedule_publish_success",
  "schedule_publish_failed",
  "content_quality_warning",
  "content_quality_needs_fix",
  "content_quality_restored",
  "content_quality_permanently_hidden",
  "content_quality_monetization_disabled",
  "content_quality_free_access",
  "coin_refund_quality"
] as const;

export type NotificationType = (typeof notificationTypes)[number];

/** @deprecated Dùng NotificationCategory */
export type NotificationGroup = "reader" | "author" | "system";

export type NotificationCategory =
  | "reading"
  | "author"
  | "community"
  | "wallet"
  | "creator"
  | "messages"
  | "system";

export type NotificationFilterTab =
  | "all"
  | "unread"
  | "reading"
  | "author"
  | "community"
  | "wallet"
  | "messages"
  | "system";

export const notificationTargetTypes = [
  "story",
  "chapter",
  "comment",
  "author",
  "challenge",
  "milestone",
  "profile",
  "wallet",
  "transaction",
  "community_post",
  "payout_request"
] as const;

export type NotificationTargetType = (typeof notificationTargetTypes)[number];

export type NotificationMetadata = {
  story_title?: string;
  story_slug?: string;
  chapter_number?: number;
  chapter_title?: string;
  author_name?: string;
  coin_amount?: number;
  group_name?: string;
  context_label?: string;
  thumbnail_url?: string;
  [key: string]: unknown;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  target_type: NotificationTargetType | null;
  target_id: string | null;
  action_url: string | null;
  metadata: NotificationMetadata | null;
  read_at: string | null;
  created_at: string;
  story_id?: string | null;
  chapter_id?: string | null;
  author_id?: string | null;
};

export type NotificationPreferences = {
  reader_enabled: boolean;
  author_enabled: boolean;
  system_enabled: boolean;
  community_enabled: boolean;
  wallet_enabled: boolean;
  creator_enabled: boolean;
};
