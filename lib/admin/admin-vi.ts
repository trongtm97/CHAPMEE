/** Chuỗi UI dùng chung trong khu vực admin (tiếng Việt). */

export const ADMIN_VI = {
  accessDenied: "Không có quyền truy cập admin",
  accessDeniedShort: "Không có quyền truy cập",
  adminOnlyNote: "Chỉ dành cho quản trị viên hoặc founder.",
  loadDashboardError: "Không tải được bảng điều khiển admin",
  backToAdmin: "← Quay lại Admin",
  adminArea: "Khu vực quản trị",
  overview: "Tổng quan",
  users: "Người dùng",
  createUser: "Tạo tài khoản mới",
  financeDashboard: "Bảng điều khiển tài chính",
  financeExports: "Xuất báo cáo tài chính",
  openFinanceExports: "Mở xuất báo cáo tài chính →"
} as const;

export function adminLoadError(what: string) {
  return `Không tải được ${what}.`;
}
