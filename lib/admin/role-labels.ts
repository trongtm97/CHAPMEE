import type { RoleCode } from "@/types/permissions";

const ROLE_LABELS_VI: Record<RoleCode, string> = {
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

const PROFILE_STATUS_VI: Record<string, string> = {
  active: "Hoạt động",
  banned: "Đã cấm",
  suspended: "Tạm khóa",
  pending: "Chờ xử lý"
};

export function formatAdminRoleLabel(code: RoleCode, dbName?: string | null): string {
  return ROLE_LABELS_VI[code] ?? dbName?.trim() ?? code;
}

export function formatProfileStatusLabel(status: string): string {
  return PROFILE_STATUS_VI[status] ?? status;
}
