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
  const canCampaigns = !flags || flags.canManageCampaigns || flags.canManageFinance;

  return [
    {
      id: "operations",
      title: "Vận hành",
      items: [
        { href: "/admin/content", label: "Kiểm duyệt" },
        { href: "/admin/reports", label: "Báo cáo vi phạm" },
        { href: "/admin/content-quality", label: "Chất lượng nội dung" },
        { href: "/admin/content-taxonomy-quality", label: "Phân loại & tag" },
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
        {
          href: "/admin/monetization/completion-reviews",
          label: "Duyệt hoàn thành truyện",
          disabled: !canFinance
        },
        { href: "/admin/creator-fee-policies", label: "Phí tác giả", disabled: !canFinance }
      ]
    },
    {
      id: "content-ip",
      title: "Nội dung & IP",
      items: [
        { href: "/admin/originals", label: "Originals / IP", disabled: !canFinance },
        { href: "/admin/campaigns", label: "Chiến dịch", disabled: !canCampaigns },
        { href: "/admin/content-hub", label: "Bài viết" },
        { href: "/admin/policies", label: "Chính sách" },
        { href: "/admin/announcements", label: "Thông báo nền tảng" },
        { href: "/admin/notifications", label: "Notification Campaign" },
        { href: "/admin/content-hub/platform", label: "Campaigns & SEO" },
        { href: "/admin/seo", label: "SEO Control Panel" }
      ]
    },
    {
      id: "system",
      title: "Hệ thống",
      items: [
        { href: "/admin/monetization-settings", label: "Cấu hình kiếm tiền" },
        {
          href: "/admin/ads",
          label: "Quảng cáo & chia sẻ QC",
          disabled: !canFinance
        },
        { href: "/admin/taxonomy", label: "Taxonomy truyện" },
        { href: "/admin/taxonomy-analytics", label: "Phân tích taxonomy" },
        { href: "/admin/taxonomy/import-export", label: "Nhập/Xuất taxonomy" },
        { href: "/admin/story-formats", label: "Composer & định dạng" },
        { href: "/admin/algorithm", label: "Thuật toán hiển thị" },
        { href: "/admin/algorithm/rankings", label: "Bảng xếp hạng" },
        { href: "/admin/algorithm/cold-start", label: "Cold Start" },
        { href: "/admin/algorithm/audit", label: "Algorithm Audit" },
        { href: "/admin/algorithm/ecosystem", label: "Ecosystem Fairness" },
        { href: "/admin/algorithm/fairness", label: "Công bằng hiển thị" },
        { href: "/admin/storage-cleanup", label: "Storage & Cleanup" },
        { href: "/admin/settings/contact", label: "Liên hệ & góp ý" },
        { href: "/admin/feedback", label: "Feedback người dùng" },
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
  const canCampaigns = !flags || flags.canManageCampaigns || flags.canManageFinance;

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
          label: "Duyệt hoàn thành truyện",
          href: "/admin/monetization/completion-reviews",
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
          ...(!canCampaigns ? disabled("Cần quyền chiến dịch") : {})
        }
      ]
    },
    {
      id: "system",
      title: "Hệ thống",
      description: "Cấu hình, liên hệ và nhật ký thao tác.",
      links: [
        { label: "Thuật toán hiển thị", href: "/admin/algorithm" },
        { label: "Liên hệ & góp ý", href: "/admin/settings/contact" },
        { label: "Feedback người dùng", href: "/admin/feedback" },
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
