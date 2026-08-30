/**
 * Cấu hình tập trung: trang footer, pháp lý và mạng xã hội ChapMee.
 * Footer và /legal đọc từ đây — không hard-code link rải rác.
 */

export type SiteLinkGroupId =
  | "chapmee"
  | "info"
  | "general"
  | "commerce"
  | "creator"
  | "social";

export type SiteLinkItem = {
  /** Khóa ổn định (slug hoặc platform). */
  id: string;
  title: string;
  href: string;
  group: SiteLinkGroupId;
  order: number;
  description?: string;
  /** Nhãn ngắn cho footer (mặc định = title). */
  footerLabel?: string;
  isFooterVisible?: boolean;
  isLegalIndexVisible?: boolean;
};

export type SiteLinkGroup = {
  id: SiteLinkGroupId;
  title: string;
  description: string;
  sortOrder: number;
  /** Hiển thị trên trang /legal */
  showOnLegalIndex: boolean;
};

export const SITE_LINK_GROUPS: Record<SiteLinkGroupId, SiteLinkGroup> = {
  chapmee: {
    id: "chapmee",
    title: "ChapMee",
    description: "Giới thiệu, liên hệ và mục lục chính sách.",
    sortOrder: 0,
    showOnLegalIndex: false
  },
  info: {
    id: "info",
    title: "Thông tin chung",
    description: "Thông tin chủ sở hữu website.",
    sortOrder: 1,
    showOnLegalIndex: true
  },
  general: {
    id: "general",
    title: "Pháp lý chung",
    description: "Điều khoản, quyền riêng tư, cookie và các chính sách nền tảng.",
    sortOrder: 2,
    showOnLegalIndex: true
  },
  commerce: {
    id: "commerce",
    title: "Giao dịch & Bộ Công Thương",
    description: "Thanh toán, hoàn tiền, cung ứng dịch vụ số và khiếu nại.",
    sortOrder: 3,
    showOnLegalIndex: true
  },
  creator: {
    id: "creator",
    title: "Tác giả & Nền tảng",
    description: "Quy chế sàn, điều khoản tác giả, kiếm tiền và xác minh.",
    sortOrder: 4,
    showOnLegalIndex: true
  },
  social: {
    id: "social",
    title: "Mạng xã hội",
    description: "Kênh chính thức của ChapMee.",
    sortOrder: 5,
    showOnLegalIndex: false
  }
};

export const SITE_LINKS: SiteLinkItem[] = [
  {
    id: "about",
    title: "Giới thiệu",
    href: "/about",
    group: "chapmee",
    order: 0,
    description: "Tổng quan về nền tảng ChapMee.",
    isFooterVisible: true,
    isLegalIndexVisible: false
  },
  {
    id: "contact",
    title: "Liên hệ",
    href: "/contact",
    group: "chapmee",
    order: 1,
    description: "Kênh hỗ trợ và hợp tác.",
    isFooterVisible: true,
    isLegalIndexVisible: false
  },
  {
    id: "legal-index",
    title: "Chính sách & pháp lý",
    href: "/legal",
    group: "chapmee",
    order: 2,
    description: "Danh mục chính sách và quy định.",
    isFooterVisible: true,
    isLegalIndexVisible: false
  },
  {
    id: "business-info",
    title: "Thông tin chủ sở hữu website",
    href: "/legal/business-info",
    group: "info",
    order: 0,
    description:
      "Thông tin đơn vị vận hành phục vụ thông báo và đăng ký với Bộ Công Thương.",
    isLegalIndexVisible: true
  },
  {
    id: "terms",
    title: "Điều khoản sử dụng",
    href: "/legal/terms",
    group: "general",
    order: 0,
    footerLabel: "Điều khoản",
    description: "Điều khoản và giới hạn trách nhiệm khi sử dụng ChapMee.",
    isFooterVisible: true,
    isLegalIndexVisible: true
  },
  {
    id: "privacy",
    title: "Chính sách quyền riêng tư",
    href: "/legal/privacy",
    group: "general",
    order: 1,
    footerLabel: "Quyền riêng tư",
    description: "Cách ChapMee thu thập và sử dụng dữ liệu cá nhân.",
    isFooterVisible: true,
    isLegalIndexVisible: true
  },
  {
    id: "cookies",
    title: "Chính sách cookie",
    href: "/legal/cookies",
    group: "general",
    order: 2,
    description: "Cookie và công nghệ tương tự trên ChapMee.",
    isLegalIndexVisible: true
  },
  {
    id: "content-policy",
    title: "Chính sách nội dung",
    href: "/legal/content-policy",
    group: "general",
    order: 3,
    description: "Nội dung được phép, hạn chế và bị cấm.",
    isLegalIndexVisible: true
  },
  {
    id: "community-guidelines",
    title: "Nguyên tắc cộng đồng",
    href: "/legal/community-guidelines",
    group: "general",
    order: 4,
    description: "Quy tắc tương tác lành mạnh trên ChapMee.",
    isLegalIndexVisible: true
  },
  {
    id: "copyright",
    title: "Chính sách bản quyền",
    href: "/legal/copyright",
    group: "general",
    order: 5,
    description: "Tiếp nhận và xử lý báo cáo bản quyền.",
    isLegalIndexVisible: true
  },
  {
    id: "dmca",
    title: "Chính sách DMCA",
    href: "/legal/dmca",
    group: "general",
    order: 6,
    description: "Cơ chế báo cáo nội dung bị cho là vi phạm bản quyền.",
    isLegalIndexVisible: true
  },
  {
    id: "advertising-policy",
    title: "Chính sách quảng cáo",
    href: "/legal/advertising-policy",
    group: "general",
    order: 7,
    description: "Quy định hiển thị quảng cáo trên nền tảng.",
    isLegalIndexVisible: true
  },
  {
    id: "payment-policy",
    title: "Chính sách thanh toán",
    href: "/legal/payment-policy",
    group: "commerce",
    order: 0,
    description: "Thanh toán và giao dịch trên ChapMee.",
    isLegalIndexVisible: true
  },
  {
    id: "refund-policy",
    title: "Chính sách hoàn tiền",
    href: "/legal/refund-policy",
    group: "commerce",
    order: 1,
    description: "Điều kiện hoàn tiền và hoàn coin.",
    isLegalIndexVisible: true
  },
  {
    id: "service-delivery",
    title: "Chính sách cung ứng dịch vụ số",
    href: "/legal/service-delivery",
    group: "commerce",
    order: 2,
    description: "Cung ứng dịch vụ số cho người dùng.",
    isLegalIndexVisible: true
  },
  {
    id: "complaints-disputes",
    title: "Khiếu nại & giải quyết tranh chấp",
    href: "/legal/complaints-disputes",
    group: "commerce",
    order: 3,
    description: "Tiếp nhận và xử lý khiếu nại, tranh chấp.",
    isLegalIndexVisible: true
  },
  {
    id: "marketplace-regulation",
    title: "Quy chế hoạt động nền tảng",
    href: "/legal/marketplace-regulation",
    group: "creator",
    order: 0,
    description: "Nguyên tắc vận hành nền tảng ChapMee.",
    isLegalIndexVisible: true
  },
  {
    id: "creator-terms",
    title: "Điều khoản dành cho tác giả",
    href: "/legal/creator-terms",
    group: "creator",
    order: 1,
    description: "Trách nhiệm khi sử dụng Studio.",
    isLegalIndexVisible: true
  },
  {
    id: "creator-monetization-policy",
    title: "Chính sách kiếm tiền tác giả",
    href: "/legal/creator-monetization-policy",
    group: "creator",
    order: 2,
    description: "Kiếm tiền, doanh thu và rút tiền.",
    isLegalIndexVisible: true
  },
  {
    id: "creator-verification-policy",
    title: "Chính sách xác minh tác giả",
    href: "/legal/creator-verification-policy",
    group: "creator",
    order: 3,
    description: "Xác minh tài khoản và thanh toán tác giả.",
    isLegalIndexVisible: true
  },
  {
    id: "facebook",
    title: "Facebook",
    href: "/facebook",
    group: "social",
    order: 0,
    isFooterVisible: false,
    isLegalIndexVisible: false
  },
  {
    id: "tiktok",
    title: "TikTok",
    href: "/tiktok",
    group: "social",
    order: 1,
    isFooterVisible: false,
    isLegalIndexVisible: false
  },
  {
    id: "youtube",
    title: "YouTube",
    href: "/youtube",
    group: "social",
    order: 2,
    isFooterVisible: false,
    isLegalIndexVisible: false
  }
];

const SITE_LINK_GROUP_ORDER: SiteLinkGroupId[] = [
  "info",
  "general",
  "commerce",
  "creator"
];

function sortByOrder(a: SiteLinkItem, b: SiteLinkItem) {
  return a.order - b.order;
}

export function getSiteLinkByHref(href: string): SiteLinkItem | undefined {
  return SITE_LINKS.find((item) => item.href === href);
}

export function getSiteLinkById(id: string): SiteLinkItem | undefined {
  return SITE_LINKS.find((item) => item.id === id);
}

export function getLegalIndexSectionsFromConfig(): Array<{
  group: SiteLinkGroup;
  links: Array<{ title: string; href: string }>;
}> {
  return SITE_LINK_GROUP_ORDER.map((groupId) => {
    const group = SITE_LINK_GROUPS[groupId];
    const links = SITE_LINKS.filter(
      (item) => item.group === groupId && item.isLegalIndexVisible
    )
      .sort(sortByOrder)
      .map((item) => ({ title: item.title, href: item.href }));

    return { group, links };
  }).filter((section) => section.links.length > 0);
}

/** Thứ tự hiển thị footer (desktop/tablet), độc lập với order theo nhóm. */
export const FOOTER_LINK_ORDER = [
  "about",
  "contact",
  "legal-index",
  "terms",
  "privacy"
] as const;

export const FOOTER_MOBILE_LINK_HREFS = ["/about", "/contact", "/legal"] as const;

export function getFooterSiteLinks(): Array<{ label: string; href: string }> {
  return FOOTER_LINK_ORDER.map((id) => {
    const item = getSiteLinkById(id);
    if (!item?.isFooterVisible) return null;
    return {
      label: item.footerLabel?.trim() || item.title,
      href: item.href
    };
  }).filter((row): row is { label: string; href: string } => row !== null);
}

export function getFooterMobileSiteLinks(): Array<{ label: string; href: string }> {
  const all = getFooterSiteLinks();
  return all.filter((link) =>
    (FOOTER_MOBILE_LINK_HREFS as readonly string[]).includes(link.href)
  );
}
