export const PERMISSION_GROUPS = [
  "story",
  "chapter",
  "comment",
  "community",
  "reaction",
  "social",
  "wallet",
  "creator",
  "finance",
  "moderation",
  "admin",
  "notification",
  "feedback"
] as const;

export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export type PermissionCode =
  | "story.create"
  | "story.update.own"
  | "story.delete.own"
  | "story.publish.own"
  | "story.approve"
  | "story.reject"
  | "story.feature"
  | "story.moderate"
  | "chapter.create"
  | "chapter.update.own"
  | "chapter.delete.own"
  | "chapter.publish.own"
  | "chapter.set_vip"
  | "chapter.purchase"
  | "comment.create"
  | "comment.update.own"
  | "comment.delete.own"
  | "comment.moderate"
  | "comment.pin"
  | "community.post.create"
  | "community.post.update.own"
  | "community.post.delete.own"
  | "community.post.moderate"
  | "community.group.create"
  | "community.group.approve"
  | "community.group.moderate"
  | "reaction.create"
  | "reaction.delete.own"
  | "follow.create"
  | "follow.delete.own"
  | "save.create"
  | "save.delete.own"
  | "wallet.view.own"
  | "wallet.topup"
  | "wallet.purchase"
  | "wallet.tip"
  | "wallet.adjust"
  | "wallet.refund"
  | "wallet.transaction.view.own"
  | "wallet.transaction.view.all"
  | "creator.dashboard.view.own"
  | "creator.revenue.view.own"
  | "creator.payout.request"
  | "creator.payout.view.own"
  | "finance.dashboard.view"
  | "finance.payout.view"
  | "finance.payout.approve"
  | "finance.payout.reject"
  | "finance.wallet.adjust"
  | "finance.wallet.view"
  | "finance.wallet.bulk_adjust"
  | "finance.wallet.audit"
  | "finance.wallet.export"
  | "finance.refund.create"
  | "finance.refund.view"
  | "finance.refund.approve"
  | "finance.refund.reject"
  | "finance.refund.complete"
  | "finance.refund.override"
  | "finance.refund.export"
  | "finance.refund.audit.view"
  | "finance.report.export"
  | "finance.risk.view"
  | "finance.settings.view"
  | "finance.settings.update"
  | "finance.revenue_share.update"
  | "finance.withdrawal_settings.update"
  | "finance.risk_settings.update"
  | "finance.audit.view"
  | "report.create"
  | "report.review"
  | "moderation.action.create"
  | "moderation.ban_user"
  | "moderation.unban_user"
  | "moderation.appeal.review"
  | "moderation.policy.manage"
  | "admin.dashboard.view"
  | "admin.user.view"
  | "admin.user.update"
  | "admin.user.ban"
  | "admin.user.role.assign"
  | "admin.role.view"
  | "admin.user.role.view"
  | "admin.settings.view"
  | "admin.settings.update"
  | "admin.audit.view"
  | "notification.view.own"
  | "notification.send.system"
  | "notification.settings.update.own"
  | "feedback.create"
  | "feedback.view.all"
  | "feedback.update.status";

export type RoleCode =
  | "guest"
  | "reader"
  | "creator"
  | "verified_creator"
  | "vip_user"
  | "banned_user"
  | "moderator"
  | "content_admin"
  | "finance_admin"
  | "support_admin"
  | "admin"
  | "super_admin"
  | "owner";

export type ClientPermissionFlags = {
  canCreateStory: boolean;
  canOpenStudio: boolean;
  canModerateComments: boolean;
  canViewAdmin: boolean;
  canManageFinance: boolean;
  isBanned: boolean;
};
