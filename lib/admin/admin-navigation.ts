import type { AdminShortcutGroup } from "@/types/admin-dashboard";
import type { ClientPermissionFlags } from "@/types/permissions";

export type AdminNavItem = {
  href: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
};

export type AdminNavGroup = {
  id: string;
  title: string;
  items: AdminNavItem[];
};

export const ADMIN_OVERVIEW_LINK: AdminNavItem = {
  href: "/admin",
  label: "Tổng quan"
};

export function buildAdminNavGroups(
  flags?: ClientPermissionFlags
): AdminNavGroup[] {
  const canFinance = !flags || flags.canManageFinance;
  const canUsers = !flags || flags.canViewAdmin;

  return [
    {
      id: "operations",
      title: "Vận hành",
      items: [
        { href: "/admin/content", label: "Kiểm duyệt" },
        { href: "/admin/reports", label: "Báo cáo vi phạm" },
        { href: "/admin/content-quality", label: "Chất lượng nội dung" },
        { href: "/admin/community", label: "Cộng đồng" },
        { href: "/admin/messaging", label: "Tin nhắn an toàn" }
      ]
    },
    {
      id: "users",
      title: "Người dùng & tác giả",
      items: [
        { href: "/admin/users", label: "Người dùng", disabled: !canUsers },
        { href: "/admin/creators", label: "Tác giả" },
        { href: "/admin/verifications", label: "Xác thực tài khoản", disabled: !canUsers },
        { href: "/admin/username-policy", label: "Chính sách username", disabled: !canUsers },
        { href: "/admin/roles", label: "Vai trò & quyền", disabled: !canUsers }
      ]
    },
    {
      id: "finance",
      title: "Tài chính",
      items: [
        { href: "/admin/finance", label: "Tổng quan tài chính", disabled: !canFinance },
        { href: "/admin/transactions", label: "Giao dịch", disabled: !canFinance },
        { href: "/admin/coins", label: "Coin", disabled: !canFinance },
        { href: "/admin/withdrawals", label: "Rút tiền", disabled: !canFinance },
        { href: "/admin/refunds", label: "Hoàn tiền", disabled: !canFinance },
        { href: "/admin/creator-fee-policies", label: "Phí tác giả", disabled: !canFinance }
      ]
    },
    {
      id: "content-ip",
      title: "Nội dung & IP",
      items: [
        { href: "/admin/content", label: "Truyện / chương" },
        {
          href: "#",
          label: "Danh mục",
          disabled: true,
          disabledReason: "Đang phát triển"
        },
        { href: "/admin/originals", label: "Originals / IP", disabled: !canFinance },
        { href: "/admin/campaigns", label: "Chiến dịch", disabled: !canFinance }
      ]
    },
    {
      id: "system",
      title: "Hệ thống",
      items: [
        { href: "/admin/monetization-settings", label: "Cấu hình kiếm tiền" },
        { href: "/admin/settings/contact", label: "Liên hệ & góp ý" },
        { href: "/admin/audit", label: "Nhật ký audit", disabled: !canUsers },
        { href: "/admin/analytics", label: "Phân tích" }
      ]
    }
  ];
}

export function buildAdminShortcutGroups(
  flags?: ClientPermissionFlags
): AdminShortcutGroup[] {
  const canFinance = !flags || flags.canManageFinance;
  const canUsers = !flags || flags.canViewAdmin;

  const disabled = (reason = "Đang phát triển") => ({
    disabled: true as const,
    disabledReason: reason
  });

  return [
    {
      id: "operations",
      title: "Vận hành nội dung",
      description: "Duyệt nội dung, xử lý báo cáo và cộng đồng.",
      links: [
        { label: "Kiểm duyệt nội dung", href: "/admin/content" },
        { label: "Báo cáo vi phạm", href: "/admin/reports" },
        { label: "Chất lượng nội dung", href: "/admin/content-quality" },
        { label: "Cộng đồng", href: "/admin/community" },
        { label: "An toàn tin nhắn", href: "/admin/messaging" }
      ]
    },
    {
      id: "users",
      title: "Người dùng & tác giả",
      description: "Quản lý tài khoản, xác thực và quyền.",
      links: [
        { label: "Người dùng", href: "/admin/users", ...(!canUsers ? disabled() : {}) },
        { label: "Quản lý tác giả", href: "/admin/creators" },
        {
          label: "Xác thực tài khoản",
          href: "/admin/verifications",
          ...(!canUsers ? disabled() : {})
        },
        {
          label: "Chính sách username",
          href: "/admin/username-policy",
          ...(!canUsers ? disabled() : {})
        },
        {
          label: "Vai trò & quyền",
          href: "/admin/roles",
          ...(!canUsers ? disabled() : {})
        }
      ]
    },
    {
      id: "finance",
      title: "Tài chính",
      description: "Coin, giao dịch, rút tiền và cấu hình phí.",
      links: [
        {
          label: "Tổng quan tài chính",
          href: "/admin/finance",
          ...(!canFinance ? disabled("Cần quyền tài chính") : {})
        },
        {
          label: "Giao dịch",
          href: "/admin/transactions",
          ...(!canFinance ? disabled("Cần quyền tài chính") : {})
        },
        {
          label: "Quản lý coin",
          href: "/admin/coins",
          ...(!canFinance ? disabled("Cần quyền tài chính") : {})
        },
        {
          label: "Yêu cầu rút tiền",
          href: "/admin/withdrawals",
          ...(!canFinance ? disabled("Cần quyền tài chính") : {})
        },
        {
          label: "Hoàn tiền & chargeback",
          href: "/admin/refunds",
          ...(!canFinance ? disabled("Cần quyền tài chính") : {})
        },
        {
          label: "Chính sách phí tác giả",
          href: "/admin/creator-fee-policies",
          ...(!canFinance ? disabled("Cần quyền tài chính") : {})
        },
        {
          label: "Cấu hình kiếm tiền",
          href: "/admin/monetization-settings"
        }
      ]
    },
    {
      id: "content-ip",
      title: "Nội dung & thương mại IP",
      description: "Originals, thưởng tác giả và chiến dịch.",
      links: [
        { label: "Truyện / chương", href: "/admin/content" },
        { label: "Danh mục / thể loại", href: "#", ...disabled() },
        {
          label: "Originals / thỏa thuận IP",
          href: "/admin/originals",
          ...(!canFinance ? disabled("Cần quyền tài chính") : {})
        },
        {
          label: "Pool thưởng tác giả",
          href: "/admin/bonus-pools",
          ...(!canFinance ? disabled("Cần quyền tài chính") : {})
        },
        {
          label: "Chiến dịch thương hiệu",
          href: "/admin/campaigns",
          ...(!canFinance ? disabled("Cần quyền tài chính") : {})
        }
      ]
    },
    {
      id: "system",
      title: "Hệ thống",
      description: "Cấu hình, liên hệ và nhật ký thao tác.",
      links: [
        { label: "Liên hệ & góp ý", href: "/admin/settings/contact" },
        {
          label: "Nhật ký audit",
          href: "/admin/audit",
          ...(!canUsers ? disabled() : {})
        },
        { label: "Phân tích nền tảng", href: "/admin/analytics" },
        { label: "Thanh toán SePay", href: "/admin/payments", ...(!canFinance ? disabled() : {}) }
      ]
    }
  ];
}

/** Flat list for sidebar module search */
export function flattenAdminNavForSearch(groups: AdminNavGroup[]): AdminNavItem[] {
  return [
    ADMIN_OVERVIEW_LINK,
    ...groups.flatMap((g) => g.items.filter((i) => !i.disabled && i.href !== "#"))
  ];
}
