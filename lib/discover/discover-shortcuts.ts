/** Lối tắt /discover — thứ tự theo tần suất & chiến lược sản phẩm. */
export const DISCOVER_SHORTCUT_ITEMS = [
  {
    href: "/truyen-sang-tac",
    title: "Truyện sáng tác",
    subtitle: "Tác phẩm gốc từ cộng đồng ChapMee.",
    icon: "🌟",
    hot: true,
    highlight: true
  },
  {
    href: "/tien-ich/boi-tinh-yeu",
    title: "Bói tình yêu",
    subtitle: "Xem mức độ hợp nhau — miễn phí, dễ chia sẻ",
    icon: "💕",
    hot: true,
    highlight: true
  },
  {
    href: "/truyen",
    title: "Danh mục truyện",
    subtitle: "Xem toàn bộ kho truyện",
    icon: "📚",
    hot: false,
    highlight: false
  },
  {
    href: "/truyen?sort=new&page=1",
    title: "Truyện mới",
    subtitle: "Vừa đăng / vừa cập nhật",
    icon: "✨",
    hot: false,
    highlight: false
  },
  {
    href: "/truyen?status=completed&sort=completed&page=1",
    title: "Truyện hoàn thành",
    subtitle: "Đọc trọn bộ một lèo",
    icon: "✅",
    hot: false,
    highlight: false
  },
  {
    href: "/bang-xep-hang",
    title: "Bảng xếp hạng",
    subtitle: "Top truyện hôm nay",
    icon: "🏆",
    hot: false,
    highlight: false
  },
  {
    href: "/truyen-dich",
    title: "Truyện dịch",
    subtitle: "Bản dịch miễn phí đã kiểm duyệt",
    icon: "🌐",
    hot: false,
    highlight: false
  },
  {
    href: "/the-loai",
    title: "Thể loại",
    subtitle: "Drama, ngôn tình, kinh dị…",
    icon: "🎭",
    hot: false,
    highlight: false
  },
  {
    href: "/media?tab=audio",
    title: "Audio truyện",
    subtitle: "Nghe truyện trên ChapMee",
    icon: "🎧",
    hot: false,
    highlight: false
  },
  {
    href: "/media?tab=video",
    title: "Video chuyển thể",
    subtitle: "Phim / clip theo truyện",
    icon: "🎬",
    hot: false,
    highlight: false
  },
  {
    href: "/bai-viet",
    title: "Bài viết",
    subtitle: "Hướng dẫn & tin ChapMee",
    icon: "article",
    hot: false,
    highlight: false
  },
  {
    href: "/kham-pha",
    title: "Taxonomy",
    subtitle: "Tất cả nhóm nhãn",
    icon: "🧭",
    hot: false,
    highlight: false
  },
  {
    href: "/tien-ich",
    title: "Tiện ích",
    subtitle: "Bói tình yêu, icon Facebook & công cụ",
    icon: "utility-star",
    hot: false,
    highlight: false
  }
] as const;

export type DiscoverShortcutItem = (typeof DISCOVER_SHORTCUT_ITEMS)[number];
