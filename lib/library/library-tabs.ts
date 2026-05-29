import type { LibraryTab } from "@/types/library";

export const LIBRARY_TABS: { id: LibraryTab; label: string }[] = [
  { id: "reading", label: "Đọc tiếp" },
  { id: "saved", label: "Đã lưu" },
  { id: "collections", label: "Tủ của tôi" },
  { id: "following", label: "Theo dõi" }
];

export function parseLibraryTab(value: string | null | undefined): LibraryTab {
  if (
    value === "reading" ||
    value === "saved" ||
    value === "collections" ||
    value === "following"
  ) {
    return value;
  }
  return "reading";
}

export function buildLibraryHref(tab: LibraryTab) {
  return `/me/library?tab=${tab}`;
}
