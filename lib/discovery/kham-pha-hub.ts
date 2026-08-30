import { TAXONOMY_INDEX_CONFIG } from "@/lib/discovery/taxonomy-index-config";

export type KhamPhaHubSection = {
  href: string;
  kicker: string;
  title: string;
  description: string;
};

export type KhamPhaHubSectionWithStats = KhamPhaHubSection & {
  termCount: number;
  usageTotal: number;
};

/** Reader-facing taxonomy discovery hubs (ordered for /kham-pha). */
export const KHAM_PHA_HUB_SECTIONS: KhamPhaHubSection[] = [
  {
    href: "/the-loai",
    kicker: "Thể loại",
    title: "Thể loại chính",
    description: "Drama, ngôn tình, kinh dị và các thể loại lớn."
  },
  {
    href: "/the-loai-phu",
    kicker: "Thể loại phụ",
    title: "Subgenre & niche",
    description: "Thể loại phụ chi tiết gắn với từng truyện."
  },
  ...Object.values(TAXONOMY_INDEX_CONFIG)
    .filter((config) => config.pathname !== "/the-loai-phu")
    .map((config) => ({
      href: config.pathname,
      kicker: config.kicker,
      title: config.title,
      description: config.description
    }))
];

export const KHAM_PHA_QUICK_LINKS: KhamPhaHubSection[] = [
  {
    href: "/tien-ich/boi-tinh-yeu",
    kicker: "Tiện ích",
    title: "Bói tình yêu",
    description: "Xem mức độ hợp nhau theo tên và ngày sinh — miễn phí, dễ chia sẻ."
  },
  {
    href: "/discover",
    kicker: "Trang chủ",
    title: "Khám phá",
    description: "Feed gợi ý, carousel và tìm kiếm nhanh."
  },
  {
    href: "/truyen",
    kicker: "Danh mục",
    title: "Tất cả truyện",
    description: "Bộ lọc taxonomy đầy đủ và phân trang."
  },
  {
    href: "/search",
    kicker: "Tìm kiếm",
    title: "Tìm truyện",
    description: "Tìm theo tên, tag, thể loại và tác giả."
  },
  {
    href: "/bang-xep-hang",
    kicker: "Xếp hạng",
    title: "Bảng xếp hạng",
    description: "Top truyện theo thời gian và thể loại."
  }
];
