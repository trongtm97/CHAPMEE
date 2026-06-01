import { STUDIO_BASE_PATH, studioPath } from "@/lib/studio/constants";

export type StudioNavItem = {
  id: string;
  href: string;
  label: string;
  match?: "exact";
  disabled?: boolean;
  badge?: string;
};

export type StudioNavGroup = {
  id: string;
  label: string;
  items: StudioNavItem[];
};

/** Menu Studio — một nguồn cho sidebar và tài liệu. */
export const STUDIO_NAV_GROUPS: StudioNavGroup[] = [
  {
    id: "work",
    label: "Làm việc",
    items: [
      { id: "overview", href: STUDIO_BASE_PATH, label: "Tổng quan", match: "exact" },
      { id: "stories", href: studioPath("/stories"), label: "Truyện & chương" },
      { id: "drafts", href: studioPath("/drafts"), label: "Nháp" },
      { id: "calendar", href: studioPath("/calendar"), label: "Lịch đăng" }
    ]
  },
  {
    id: "growth",
    label: "Phát triển",
    items: [
      { id: "reels", href: studioPath("/reels"), label: "Reels" },
      { id: "comments", href: studioPath("/comments"), label: "Bình luận" },
      { id: "analytics", href: studioPath("/analytics"), label: "Thống kê" },
      { id: "content-health", href: studioPath("/content-health"), label: "Chất lượng" }
    ]
  },
  {
    id: "money",
    label: "Kiếm tiền",
    items: [
      { id: "monetization", href: studioPath("/monetization"), label: "Kiếm tiền" },
      { id: "finance", href: studioPath("/finance"), label: "Tài chính" }
    ]
  },
  {
    id: "tools",
    label: "Công cụ",
    items: [
      { id: "templates", href: studioPath("/templates"), label: "Mẫu" },
      { id: "import", href: studioPath("/import"), label: "Nhập hàng loạt" },
      { id: "help", href: studioPath("/help"), label: "Hỗ trợ" },
      { id: "settings", href: studioPath("/settings"), label: "Cài đặt" }
    ]
  }
];

/** Danh sách phẳng — tương thích code cũ. */
export const STUDIO_NAV_ITEMS: StudioNavItem[] = STUDIO_NAV_GROUPS.flatMap(
  (group) => group.items
);

/** Tab chính trên mobile — lưới 2×3: hàng 1 + hàng 2 (5 mục + Thêm). */
export const STUDIO_MOBILE_PRIMARY_NAV_IDS = [
  "overview",
  "stories",
  "calendar",
  "analytics",
  "finance"
] as const;

export function getStudioMobileNavSections() {
  const primaryIds = new Set<string>(STUDIO_MOBILE_PRIMARY_NAV_IDS);
  const itemById = new Map(STUDIO_NAV_ITEMS.map((item) => [item.id, item]));
  const primary = STUDIO_MOBILE_PRIMARY_NAV_IDS.flatMap((id) => {
    const item = itemById.get(id);
    return item ? [item] : [];
  });
  const more = STUDIO_NAV_ITEMS.filter((item) => !primaryIds.has(item.id));

  return { more, primary };
}
