import { STUDIO_BASE_PATH, studioPath } from "@/lib/studio/constants";

export type StudioNavItem = {
  id: string;
  href: string;
  label: string;
  match?: "exact";
};

/** Menu Studio — một nguồn cho sidebar và tài liệu. */
export const STUDIO_NAV_ITEMS: StudioNavItem[] = [
  { id: "overview", href: STUDIO_BASE_PATH, label: "Tổng quan", match: "exact" },
  { id: "stories", href: studioPath("/stories"), label: "Truyện" },
  { id: "chapters", href: studioPath("/stories"), label: "Chương" },
  { id: "drafts", href: studioPath("/drafts"), label: "Nháp" },
  { id: "calendar", href: studioPath("/calendar"), label: "Lịch đăng" },
  { id: "templates", href: studioPath("/templates"), label: "Mẫu" },
  { id: "swipe", href: studioPath("/swipe"), label: "Swipe" },
  { id: "comments", href: studioPath("/comments"), label: "Bình luận" },
  { id: "monetization", href: studioPath("/monetization"), label: "Kiếm tiền" },
  { id: "finance", href: studioPath("/finance"), label: "Tài chính" },
  { id: "analytics", href: studioPath("/analytics"), label: "Thống kê" },
  { id: "content-health", href: studioPath("/content-health"), label: "Chất lượng" },
  { id: "help", href: studioPath("/help"), label: "Hỗ trợ" },
  { id: "settings", href: studioPath("/settings"), label: "Cài đặt" }
];
