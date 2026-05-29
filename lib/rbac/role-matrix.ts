import type { PermissionCode, RoleCode } from "@/types/permissions";

/** Test account emails (local / staging only). Password: see scripts/rbac-setup-test-users.mjs */
export const RBAC_TEST_ACCOUNT_EMAILS: Record<string, string> = {
  reader: "test_reader@chapchap.test",
  creator: "test_creator@chapchap.test",
  verified_creator: "test_verified_creator@chapchap.test",
  moderator: "test_moderator@chapchap.test",
  content_admin: "test_content_admin@chapchap.test",
  finance_admin: "test_finance_admin@chapchap.test",
  support_admin: "test_support_admin@chapchap.test",
  admin: "test_admin@chapchap.test",
  super_admin: "test_super_admin@chapchap.test",
  owner: "test_owner@chapchap.test",
  banned: "test_banned@chapchap.test"
};

export type RoleMatrixExpectation = {
  role: RoleCode;
  mustHave: PermissionCode[];
  mustNotHave: PermissionCode[];
};

const READER: PermissionCode[] = [
  "comment.create",
  "wallet.view.own",
  "wallet.topup",
  "wallet.purchase",
  "wallet.tip",
  "wallet.transaction.view.own",
  "save.create",
  "follow.create"
];

const CREATOR: PermissionCode[] = [
  ...READER,
  "story.create",
  "story.update.own",
  "creator.dashboard.view.own",
  "creator.revenue.view.own",
  "creator.payout.request"
];

const MODERATOR: PermissionCode[] = [
  "report.review",
  "comment.moderate",
  "community.post.moderate",
  "moderation.ban_user"
];

const CONTENT_ADMIN: PermissionCode[] = [
  "story.approve",
  "story.reject",
  "story.moderate",
  "chapter.set_vip"
];

const FINANCE: PermissionCode[] = [
  "finance.dashboard.view",
  "finance.payout.view",
  "finance.payout.approve",
  "finance.payout.reject",
  "finance.wallet.adjust",
  "finance.refund.create",
  "finance.refund.view",
  "finance.refund.approve",
  "finance.refund.reject",
  "finance.refund.complete",
  "finance.refund.override",
  "finance.refund.export",
  "finance.refund.audit.view",
  "finance.report.export",
  "finance.risk.view",
  "wallet.transaction.view.all"
];

const SUPPORT: PermissionCode[] = [
  "admin.user.view",
  "feedback.view.all",
  "feedback.update.status",
  "wallet.transaction.view.all"
];

const ADMIN: PermissionCode[] = [
  "admin.dashboard.view",
  "admin.user.view",
  "admin.user.ban",
  "admin.settings.view",
  "admin.audit.view",
  "report.review",
  "story.approve"
];

const NO_FINANCE: PermissionCode[] = [
  "finance.dashboard.view",
  "finance.payout.approve",
  "finance.wallet.adjust",
  "finance.refund.create"
];

const NO_MOD: PermissionCode[] = [
  "story.approve",
  "comment.moderate",
  "moderation.ban_user"
];

const NO_ADMIN: PermissionCode[] = [
  "admin.dashboard.view",
  "admin.user.role.assign",
  "admin.audit.view"
];

const NO_CREATOR: PermissionCode[] = [
  "story.create",
  "creator.payout.request"
];

/** DB `user_has_permission` expectations (from migration 052 seeds). */
export const ROLE_MATRIX: RoleMatrixExpectation[] = [
  {
    role: "reader",
    mustHave: READER,
    mustNotHave: [...NO_FINANCE, ...NO_MOD, ...NO_ADMIN, ...NO_CREATOR]
  },
  {
    role: "creator",
    mustHave: CREATOR,
    mustNotHave: [...NO_FINANCE, ...NO_MOD, ...NO_ADMIN, "story.approve"]
  },
  {
    role: "verified_creator",
    mustHave: [...CREATOR, "chapter.set_vip", "creator.payout.view.own"],
    mustNotHave: [...NO_FINANCE, ...NO_MOD, ...NO_ADMIN, "story.approve"]
  },
  {
    role: "moderator",
    mustHave: MODERATOR,
    mustNotHave: [...NO_FINANCE, ...NO_ADMIN, "story.approve", "admin.settings.update"]
  },
  {
    role: "content_admin",
    mustHave: CONTENT_ADMIN,
    mustNotHave: [...NO_FINANCE, "admin.user.role.assign", "moderation.ban_user"]
  },
  {
    role: "finance_admin",
    mustHave: FINANCE,
    mustNotHave: [...NO_MOD, "story.approve", "admin.user.role.assign", "comment.moderate"]
  },
  {
    role: "support_admin",
    mustHave: SUPPORT,
    mustNotHave: [...NO_FINANCE, ...NO_MOD, "admin.user.role.assign", "admin.settings.update"]
  },
  {
    role: "admin",
    mustHave: ADMIN,
    mustNotHave: [...NO_FINANCE, "admin.user.role.assign"]
  },
  {
    role: "super_admin",
    mustHave: [...ADMIN, "admin.user.role.assign", "finance.dashboard.view"],
    mustNotHave: ["finance.wallet.adjust", "finance.refund.create"]
  },
  {
    role: "owner",
    mustHave: ["admin.user.role.assign", "finance.wallet.adjust", "story.approve"],
    mustNotHave: []
  }
];

export const RLS_MATRIX = {
  crossWalletReadDenied: true,
  crossWalletUpdateDenied: true,
  userRolesInsertDenied: true,
  auditLogsReadDeniedForReader: true,
  payoutStatusUpdateDeniedForCreator: true
} as const;

export const ASSIGN_ROLE_MATRIX: Array<{
  actor: RoleCode;
  target: RoleCode;
  expected: "allow" | "deny";
}> = [
  { actor: "reader", target: "moderator", expected: "deny" },
  { actor: "moderator", target: "admin", expected: "deny" },
  { actor: "admin", target: "owner", expected: "deny" },
  { actor: "admin", target: "super_admin", expected: "deny" },
  { actor: "super_admin", target: "moderator", expected: "allow" },
  { actor: "super_admin", target: "owner", expected: "deny" },
  { actor: "owner", target: "super_admin", expected: "allow" },
  { actor: "owner", target: "owner", expected: "allow" }
];
