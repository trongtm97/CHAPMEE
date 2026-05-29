import type { RoleGroupKey } from "@/types/admin-roles";
import type { PermissionCode, RoleCode } from "@/types/permissions";

export const ROLE_LABELS_VI: Record<RoleCode, string> = {
  guest: "Khách chưa đăng nhập",
  reader: "Độc giả",
  creator: "Tác giả",
  verified_creator: "Tác giả xác thực",
  vip_user: "Người dùng VIP",
  banned_user: "Tài khoản bị hạn chế",
  moderator: "Kiểm duyệt viên",
  content_admin: "Quản trị nội dung",
  finance_admin: "Quản trị tài chính",
  support_admin: "Hỗ trợ khách hàng",
  admin: "Quản trị viên",
  super_admin: "Siêu quản trị",
  owner: "Chủ sở hữu"
};

export const ROLE_GROUP_LABELS_VI: Record<RoleGroupKey, string> = {
  platform_admin: "Quản trị nền tảng",
  operations: "Vận hành",
  finance: "Tài chính",
  support: "Hỗ trợ",
  creator: "Tác giả",
  reader: "Độc giả",
  restricted: "Hạn chế",
  guest: "Khách"
};

export const ROLE_GROUP_MAP: Record<RoleCode, RoleGroupKey> = {
  owner: "platform_admin",
  super_admin: "platform_admin",
  admin: "platform_admin",
  content_admin: "operations",
  moderator: "operations",
  finance_admin: "finance",
  support_admin: "support",
  creator: "creator",
  verified_creator: "creator",
  reader: "reader",
  vip_user: "reader",
  banned_user: "restricted",
  guest: "guest"
};

export const ROLE_DESCRIPTIONS_VI: Partial<Record<RoleCode, string>> = {
  owner: "Toàn quyền nền tảng ChapMee.",
  super_admin: "Quản trị cấp cao, gán vai trò và cấu hình hệ thống.",
  admin: "Quản trị viên vận hành nội dung, người dùng và kiểm duyệt.",
  content_admin: "Duyệt và quản lý nội dung truyện.",
  moderator: "Kiểm duyệt cộng đồng, bình luận và báo cáo.",
  finance_admin: "Quản lý tài chính, ví, rút tiền và hoàn tiền.",
  support_admin: "Hỗ trợ người dùng và xử lý phản hồi.",
  creator: "Tác giả đăng và quản lý truyện trên Studio.",
  verified_creator: "Tác giả xác thực với quyền Studio mở rộng.",
  reader: "Độc giả đọc truyện và tương tác cơ bản.",
  vip_user: "VIP user là entitlement/benefit, không phải quyền quản trị.",
  banned_user: "Tài khoản bị hạn chế, chặn hành động ghi tuỳ theo policy.",
  guest: "Khách chưa đăng nhập, quyền truy cập tối thiểu."
};

export const SENSITIVE_PERMISSIONS: PermissionCode[] = [
  "admin.user.role.assign",
  "admin.user.ban",
  "admin.user.update",
  "admin.settings.update",
  "admin.audit.view",
  "finance.payout.approve",
  "finance.payout.reject",
  "finance.wallet.adjust",
  "finance.refund.create",
  "wallet.adjust",
  "wallet.refund",
  "moderation.ban_user",
  "moderation.unban_user",
  "moderation.policy.manage",
  "story.approve",
  "story.reject",
  "chapter.set_vip",
  "notification.send.system"
];

export const FINANCE_PERMISSION_PREFIXES = ["finance.", "wallet.adjust", "wallet.refund"];
export const MODERATION_PERMISSION_PREFIXES = ["moderation.", "report.review"];
export const USER_ADMIN_PERMISSION_CODES: PermissionCode[] = [
  "admin.user.view",
  "admin.user.update",
  "admin.user.ban",
  "admin.user.role.assign"
];

export const ADMIN_ROLE_CODES: RoleCode[] = [
  "owner",
  "super_admin",
  "admin",
  "content_admin",
  "finance_admin",
  "support_admin",
  "moderator"
];

export const CREATOR_READER_ROLE_CODES: RoleCode[] = [
  "creator",
  "verified_creator",
  "reader",
  "vip_user"
];

export const ROLE_AUDIT_ACTIONS = [
  "role_assigned",
  "role_removed",
  "role_assignment_expired",
  "role_permission_viewed",
  "role_matrix_viewed",
  "sensitive_role_assigned",
  "sensitive_role_removed",
  "user_permission_checked",
  "assign_role",
  "remove_role"
] as const;

export function formatRoleLabel(code: RoleCode, dbName?: string | null): string {
  return ROLE_LABELS_VI[code] ?? dbName?.trim() ?? code;
}

export function getRoleGroup(code: RoleCode): RoleGroupKey {
  return ROLE_GROUP_MAP[code] ?? "reader";
}

export function getRoleDescription(code: RoleCode, dbDescription?: string | null): string {
  return ROLE_DESCRIPTIONS_VI[code] ?? dbDescription?.trim() ?? "—";
}

export function isSensitivePermission(code: string): boolean {
  return SENSITIVE_PERMISSIONS.includes(code as PermissionCode);
}

export function roleHasSensitivePermissions(permissions: Array<{ code: string }>): boolean {
  return permissions.some((p) => isSensitivePermission(p.code));
}

export function roleHasFinancePermissions(permissions: Array<{ code: string }>): boolean {
  return permissions.some(
    (p) =>
      p.code.startsWith("finance.") ||
      p.code === "wallet.adjust" ||
      p.code === "wallet.refund" ||
      p.code === "wallet.transaction.view.all"
  );
}

export function roleHasModerationPermissions(permissions: Array<{ code: string }>): boolean {
  return permissions.some(
    (p) =>
      p.code.startsWith("moderation.") ||
      p.code === "report.review" ||
      p.code === "comment.moderate"
  );
}

export function roleHasUserAdminPermissions(permissions: Array<{ code: string }>): boolean {
  return permissions.some((p) =>
    USER_ADMIN_PERMISSION_CODES.includes(p.code as PermissionCode)
  );
}

export function isSensitiveRole(code: RoleCode, permissions: Array<{ code: string }>): boolean {
  if (code === "owner" || code === "super_admin" || code === "finance_admin") {
    return true;
  }
  return roleHasSensitivePermissions(permissions);
}

export function getPrimaryPermissionGroups(
  permissions: Array<{ code: string; group_key: string | null }>,
  limit = 3
): string[] {
  const counts = new Map<string, number>();
  for (const perm of permissions) {
    const group = getPermissionCategoryLabel(perm.code);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}

const PERMISSION_CATEGORY_RULES: Array<{ prefix: string; label: string }> = [
  { prefix: "story.", label: "Nội dung truyện" },
  { prefix: "chapter.", label: "Chương" },
  { prefix: "comment.", label: "Bình luận" },
  { prefix: "community.", label: "Cộng đồng" },
  { prefix: "message.", label: "Tin nhắn" },
  { prefix: "admin.user.", label: "Người dùng" },
  { prefix: "admin.", label: "Quản trị hệ thống" },
  { prefix: "finance.", label: "Tài chính" },
  { prefix: "wallet.", label: "Ví/Coin" },
  { prefix: "creator.", label: "Studio/Tác giả" },
  { prefix: "moderation.", label: "Kiểm duyệt" },
  { prefix: "report.", label: "Báo cáo" },
  { prefix: "notification.", label: "Thông báo" },
  { prefix: "feedback.", label: "Góp ý" },
  { prefix: "save.", label: "Tủ truyện" },
  { prefix: "follow.", label: "Theo dõi" },
  { prefix: "reaction.", label: "Tương tác" }
];

export function getPermissionCategoryLabel(code: string): string {
  for (const rule of PERMISSION_CATEGORY_RULES) {
    if (code.startsWith(rule.prefix)) {
      return rule.label;
    }
  }
  return "Khác";
}

export function groupPermissionsByCategory<T extends { code: string; name: string }>(
  permissions: T[]
): Array<{ category: string; permissions: T[] }> {
  const map = new Map<string, T[]>();
  for (const perm of permissions) {
    const category = getPermissionCategoryLabel(perm.code);
    const list = map.get(category) ?? [];
    list.push(perm);
    map.set(category, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "vi"))
    .map(([category, perms]) => ({
      category,
      permissions: perms.sort((a, b) => a.code.localeCompare(b.code))
    }));
}
