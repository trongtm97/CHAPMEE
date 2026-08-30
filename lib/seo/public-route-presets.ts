import type { SeoPageType } from "@/lib/seo/seo-constants";

export type SeoPublicRoutePipeline = "resolver" | "legacy" | "cms";

export type SeoPublicRoutePreset = {
  path: string;
  label: string;
  description: string;
  pageType: SeoPageType;
  group: string;
  /** Whether `/admin/seo/overrides` applies to this path. */
  supportsOverride: boolean;
  pipeline: SeoPublicRoutePipeline;
};

/** Curated public routes — RankMath-style page picker for SEO Center. */
export const SEO_PUBLIC_ROUTE_PRESETS: SeoPublicRoutePreset[] = [
  {
    path: "/",
    label: "Trang chủ",
    description: "Reels feed mặc định khi mở chapmee.com",
    pageType: "reels",
    group: "Trang chính",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/reels",
    label: "Reels",
    description: "Trang Reels đầy đủ",
    pageType: "reels",
    group: "Trang chính",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/discover",
    label: "Khám phá",
    description: "Feed khám phá truyện",
    pageType: "discover",
    group: "Trang chính",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/truyen",
    label: "Danh mục truyện",
    description: "Catalog tổng — trang danh mục chính",
    pageType: "story_catalog",
    group: "Danh mục truyện",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/truyen-dich",
    label: "Truyện dịch",
    description: "Danh mục truyện dịch",
    pageType: "story_catalog",
    group: "Danh mục truyện",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/truyen-sang-tac",
    label: "Truyện sáng tác",
    description: "Danh mục truyện sáng tác",
    pageType: "story_catalog",
    group: "Danh mục truyện",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/media",
    label: "Media / Audio",
    description: "Thư viện audio & media",
    pageType: "media",
    group: "Danh mục truyện",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/bang-xep-hang",
    label: "Bảng xếp hạng",
    description: "Trang chủ BXH",
    pageType: "ranking",
    group: "Bảng xếp hạng",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/bang-xep-hang/duoc-de-cu",
    label: "BXH — Được đề cử",
    description: "Trang con bảng xếp hạng",
    pageType: "ranking",
    group: "Bảng xếp hạng",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/bai-viet",
    label: "Bài viết / Blog",
    description: "Danh sách bài viết công khai",
    pageType: "content_post",
    group: "Nội dung",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/search",
    label: "Tìm kiếm",
    description: "Trang tìm kiếm — mặc định noindex, vẫn chỉnh title/description",
    pageType: "static",
    group: "Trang tĩnh",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/community/groups",
    label: "Nhóm truyện (Community)",
    description: "Danh sách nhóm fandom — mặc định noindex",
    pageType: "community",
    group: "Community",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/about",
    label: "Giới thiệu",
    description: "Override SEO hoặc chỉnh trong Content Hub",
    pageType: "static",
    group: "Trang tĩnh",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/contact",
    label: "Liên hệ",
    description: "Override SEO hoặc chỉnh trong Content Hub",
    pageType: "static",
    group: "Trang tĩnh",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/legal",
    label: "Pháp lý (index)",
    description: "Danh sách trang pháp lý",
    pageType: "policy",
    group: "Trang tĩnh",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/chinh-sach",
    label: "Chính sách (index)",
    description: "Danh sách chính sách công khai",
    pageType: "policy",
    group: "Trang tĩnh",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/thong-bao",
    label: "Thông báo (index)",
    description: "Danh sách thông báo nền tảng",
    pageType: "announcement",
    group: "Trang tĩnh",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/kham-pha",
    label: "Khám phá taxonomy",
    description: "Trung tâm duyệt taxonomy truyện",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich",
    label: "Tiện ích",
    description: "Hub công cụ hỗ trợ — bói tình yêu, icon Facebook và tiện ích khác",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/boi-tinh-yeu",
    label: "Bói Tình Yêu",
    description: "Xem mức độ hợp nhau theo tên và ngày sinh — thần số học, cung hoàng đạo, con giáp",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/icon",
    label: "Icon Facebook",
    description: "Công cụ sao chép emoji / icon Facebook",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/xoa-dau-tieng-viet",
    label: "Xóa Dấu Tiếng Việt",
    description: "Chuyển tiếng Việt có dấu sang không dấu, tạo slug SEO",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/chuyen-so-tien-thanh-chu",
    label: "Chuyển Số Tiền Thành Chữ",
    description: "Chuyển số tiền sang chữ tiếng Việt cho hợp đồng, hóa đơn",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/dem-tu-ky-tu",
    label: "Đếm Từ / Ký Tự",
    description: "Đếm từ, ký tự, câu, dòng, đoạn văn và ước tính thời gian đọc",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/chuyen-chu-hoa-thuong",
    label: "Chuyển Chữ Hoa / Thường",
    description: "Chuyển đổi văn bản sang chữ hoa, chữ thường, viết hoa đầu câu và viết hoa mỗi từ",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/tao-ma-qr-code",
    label: "Tạo Mã QR Code",
    description: "Tạo mã QR Code miễn phí cho liên kết, văn bản, WiFi, danh thiếp và nhiều nội dung khác",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/tinh-bmi",
    label: "Tính BMI",
    description: "Tính chỉ số khối cơ thể (BMI) từ cân nặng và chiều cao — phân loại và khoảng cân nặng tham khảo",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/tinh-tdee",
    label: "Công Cụ Tính TDEE",
    description:
      "Tính BMR, TDEE, calo duy trì, calo giảm cân, calo tăng cân và macro tham khảo dựa trên thông tin cơ thể và mức vận động",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/tinh-lai-suat",
    label: "Công cụ tính lãi",
    description:
      "Tính lãi suất kép, lãi tiết kiệm và lãi vay — xem tổng tiền nhận được, tiền lãi dự kiến, lịch trả nợ theo kỳ hạn",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/tinh-thue-vat",
    label: "Công Cụ Tính Thuế VAT",
    description:
      "Tính thuế VAT nhanh theo 2 chiều — từ giá chưa VAT ra giá sau VAT, hoặc tách ngược từ giá đã có VAT",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/tinh-phan-tram",
    label: "Tính Phần Trăm",
    description:
      "Tính % của một số, tỷ lệ %, tăng/giảm %, phần trăm thay đổi, giá sau giảm giá và tìm giá gốc trước khi giảm",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/tinh-ngay-quan-he-an-toan",
    label: "Tính Ngày Quan Hệ An Toàn",
    description:
      "Ước tính ngày rụng trứng, khoảng dễ thụ thai và ngày ít khả năng thụ thai dựa trên chu kỳ kinh nguyệt",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  },
  {
    path: "/tien-ich/pomodoro",
    label: "Pomodoro Timer",
    description:
      "Đồng hồ Pomodoro giúp tập trung làm việc theo chu kỳ — tùy chỉnh thời gian, preset nhanh, âm báo và thông báo trình duyệt",
    pageType: "static",
    group: "Khám phá",
    supportsOverride: true,
    pipeline: "resolver"
  }
];

export function groupSeoPublicRoutePresets(
  presets: SeoPublicRoutePreset[] = SEO_PUBLIC_ROUTE_PRESETS
): { group: string; items: SeoPublicRoutePreset[] }[] {
  const map = new Map<string, SeoPublicRoutePreset[]>();
  for (const preset of presets) {
    const list = map.get(preset.group) ?? [];
    list.push(preset);
    map.set(preset.group, list);
  }
  return [...map.entries()].map(([group, items]) => ({ group, items }));
}
