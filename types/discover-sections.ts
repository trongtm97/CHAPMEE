import type { CandidatePoolId } from "@/types/feed-mixer";

export const DISCOVER_SECTION_KEYS = [
  "recommended",
  "trending_in_taste",
  "notable_new",
  "new_authors",
  "might_miss",
  "underexposed_genres",
  "completed",
  "ranking_today",
  "featured_originals",
  "free_translations",
  "top_originals",
  "top_translations",
  "recommended_boosted"
] as const;

export type DiscoverSectionKey = (typeof DISCOVER_SECTION_KEYS)[number];

export type DiscoverSectionConfig = {
  key: DiscoverSectionKey;
  title: string;
  subtitle?: string;
  href: string;
  pools: CandidatePoolId[];
  limit: number;
  variant: "carousel" | "ranking" | "creators";
};

export const DISCOVER_SECTION_CONFIG: DiscoverSectionConfig[] = [
  {
    key: "recommended",
    title: "Đề xuất cho bạn",
    subtitle: "Cá nhân hóa theo gu đọc của bạn",
    href: "/truyen?sort=recommended",
    pools: ["personalized", "followed_author"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "trending_in_taste",
    title: "Đang lên trong gu của bạn",
    subtitle: "Xu hướng phù hợp sở thích",
    href: "/truyen?sort=hot",
    pools: ["trending_quality", "growing", "personalized"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "notable_new",
    title: "Truyện mới đáng chú ý",
    subtitle: "Mới xuất bản và vừa qualify thử nghiệm",
    href: "/truyen?sort=new",
    pools: ["fresh", "cold_start", "growing"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "new_authors",
    title: "Tác giả mới",
    subtitle: "Tác giả mới đang được giới thiệu",
    href: "/tac-gia",
    pools: ["new_author"],
    limit: 8,
    variant: "creators"
  },
  {
    key: "might_miss",
    title: "Có thể bạn bỏ lỡ",
    subtitle: "Long-tail chất lượng, ít được chú ý",
    href: "/truyen?sort=longtail",
    pools: ["long_tail_quality", "under_exposed"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "underexposed_genres",
    title: "Thể loại đang thiếu spotlight",
    subtitle: "Taxonomy chất lượng nhưng ít được hiển thị",
    href: "/kham-pha",
    pools: ["under_exposed", "long_tail_quality", "cold_start"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "completed",
    title: "Truyện hoàn thành",
    subtitle: "Đọc trọn vẹn không chờ đợi",
    href: "/truyen?sort=completed",
    pools: ["completed_story"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "featured_originals",
    title: "Truyện sáng tác đang nổi",
    subtitle: "Xương sống creator ecosystem của ChapMee",
    href: "/truyen-sang-tac",
    pools: ["original_pool", "personalized", "trending_quality"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "free_translations",
    title: "Truyện Dịch miễn phí",
    subtitle: "Nội dung chuyển ngữ miễn phí theo chính sách nền tảng",
    href: "/truyen-dich",
    pools: ["translation_pool", "mixed_pool"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "ranking_today",
    title: "Top hôm nay",
    subtitle: "Bảng xếp hạng 24 giờ",
    href: "/bang-xep-hang/hom-nay",
    pools: [],
    limit: 5,
    variant: "ranking"
  },
  {
    key: "top_originals",
    title: "Top truyện sáng tác",
    subtitle: "Xếp hạng riêng cho tác phẩm sáng tác",
    href: "/truyen-sang-tac?sort=hot",
    pools: ["original_pool", "trending_quality"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "top_translations",
    title: "Top Truyện Dịch",
    subtitle: "Xếp hạng riêng cho truyện dịch",
    href: "/truyen-dich?sort=reads",
    pools: ["translation_pool", "mixed_pool"],
    limit: 8,
    variant: "carousel"
  },
  {
    key: "recommended_boosted",
    title: "Được Đề Cử",
    subtitle: "Boost có kiểm soát, không vượt quá organic ranking",
    href: "/truyen?sort=saved",
    pools: ["admin_boost", "trending_quality", "original_pool"],
    limit: 8,
    variant: "carousel"
  }
];

export const ANONYMOUS_RECOMMENDED_POOLS: CandidatePoolId[] = [
  "trending_quality",
  "fresh",
  "long_tail_quality",
  "new_author"
];
