import type { TaxonomyType } from "@/types/taxonomy";

export type TaxonomyIndexKey =
  | "the-loai-phu"
  | "tag"
  | "boi-canh"
  | "cam-giac"
  | "dinh-dang"
  | "nhan-vat"
  | "quan-he"
  | "phong-cach"
  | "canh-bao"
  | "tinh-trang"
  | "goi-truy-cap"
  | "loai-truyen"
  | "do-tuoi";

export type TaxonomyIndexConfig = {
  type: TaxonomyType;
  pathname: string;
  kicker: string;
  title: string;
  description: string;
  emptyMessage: string;
  metadataTitle: string;
  metadataDescription: string;
};

export const TAXONOMY_INDEX_CONFIG: Record<TaxonomyIndexKey, TaxonomyIndexConfig> = {
  "the-loai-phu": {
    type: "subgenre",
    pathname: "/the-loai-phu",
    kicker: "Thể loại phụ",
    title: "Thể loại phụ & niche",
    description: "Subgenre chi tiết — lọc truyện theo nhãn phụ từ taxonomy.",
    emptyMessage: "Chưa có thể loại phụ nào đủ truyện để hiển thị.",
    metadataTitle: "Thể loại phụ truyện | ChapMee",
    metadataDescription: "Khám phá truyện theo thể loại phụ trên ChapMee."
  },
  tag: {
    type: "trope_tag",
    pathname: "/tag",
    kicker: "Tag truyện",
    title: "Khám phá theo tag",
    description: "Chọn tag / motif để xem truyện public tương ứng.",
    emptyMessage: "Chưa có tag nào đủ truyện để hiển thị.",
    metadataTitle: "Tag truyện trên ChapMee",
    metadataDescription: "Duyệt truyện theo tag và motif trên ChapMee."
  },
  "boi-canh": {
    type: "setting_tag",
    pathname: "/boi-canh",
    kicker: "Bối cảnh",
    title: "Khám phá theo bối cảnh",
    description: "Thế giới, không gian và bối cảnh câu chuyện.",
    emptyMessage: "Chưa có bối cảnh nào đủ truyện để hiển thị.",
    metadataTitle: "Bối cảnh truyện | ChapMee",
    metadataDescription: "Tìm truyện theo bối cảnh và setting."
  },
  "cam-giac": {
    type: "reader_experience",
    pathname: "/cam-giac",
    kicker: "Cảm giác đọc",
    title: "Đọc theo cảm giác",
    description: "Chọn mood và trải nghiệm đọc bạn muốn.",
    emptyMessage: "Chưa có nhãn cảm giác nào đủ truyện để hiển thị.",
    metadataTitle: "Cảm giác đọc truyện | ChapMee",
    metadataDescription: "Khám phá truyện theo cảm giác và mood đọc."
  },
  "dinh-dang": {
    type: "presentation_mode",
    pathname: "/dinh-dang",
    kicker: "Định dạng",
    title: "Format trình bày truyện",
    description: "Chat story, truyện ngắn, visual novel và format khác.",
    emptyMessage: "Chưa có định dạng nào đủ truyện để hiển thị.",
    metadataTitle: "Định dạng truyện | ChapMee",
    metadataDescription: "Tìm truyện theo cách trình bày và format."
  },
  "nhan-vat": {
    type: "character_tag",
    pathname: "/nhan-vat",
    kicker: "Nhân vật",
    title: "Archetype & nhân vật",
    description: "Tìm truyện theo kiểu nhân vật nổi bật.",
    emptyMessage: "Chưa có nhãn nhân vật nào đủ truyện để hiển thị.",
    metadataTitle: "Nhân vật trong truyện | ChapMee",
    metadataDescription: "Khám phá truyện theo archetype nhân vật."
  },
  "quan-he": {
    type: "relationship_tag",
    pathname: "/quan-he",
    kicker: "Quan hệ",
    title: "Khám phá theo quan hệ",
    description: "Tình tiết và dynamic quan hệ giữa nhân vật.",
    emptyMessage: "Chưa có nhãn quan hệ nào đủ truyện để hiển thị.",
    metadataTitle: "Quan hệ nhân vật | ChapMee",
    metadataDescription: "Tìm truyện theo loại quan hệ nhân vật."
  },
  "phong-cach": {
    type: "narrative_style",
    pathname: "/phong-cach",
    kicker: "Phong cách",
    title: "Phong cách kể chuyện",
    description: "Giọng văn và cách kể đặc trưng.",
    emptyMessage: "Chưa có phong cách nào đủ truyện để hiển thị.",
    metadataTitle: "Phong cách kể | ChapMee",
    metadataDescription: "Khám phá truyện theo phong cách narrative."
  },
  "canh-bao": {
    type: "content_warning",
    pathname: "/canh-bao",
    kicker: "Cảnh báo",
    title: "Cảnh báo nội dung",
    description: "Xem truyện theo nhãn cảnh báo để chọn phù hợp.",
    emptyMessage: "Chưa có cảnh báo nào đủ truyện để hiển thị.",
    metadataTitle: "Cảnh báo nội dung truyện | ChapMee",
    metadataDescription: "Danh mục cảnh báo nội dung trên truyện ChapMee."
  },
  "tinh-trang": {
    type: "story_status",
    pathname: "/tinh-trang",
    kicker: "Trạng thái",
    title: "Trạng thái truyện",
    description: "Đang ra, hoàn thành, tạm ngưng và các trạng thái khác.",
    emptyMessage: "Chưa có trạng thái nào đủ truyện để hiển thị.",
    metadataTitle: "Trạng thái truyện | ChapMee",
    metadataDescription: "Tìm truyện theo trạng thái phát hành."
  },
  "goi-truy-cap": {
    type: "monetization_access",
    pathname: "/goi-truy-cap",
    kicker: "Truy cập",
    title: "Gói truy cập truyện",
    description: "Miễn phí, trả phí, trọn bộ và các gói khác.",
    emptyMessage: "Chưa có gói truy cập nào đủ truyện để hiển thị.",
    metadataTitle: "Gói truy cập truyện | ChapMee",
    metadataDescription: "Khám phá truyện theo mô hình truy cập."
  },
  "loai-truyen": {
    type: "content_type",
    pathname: "/loai-truyen",
    kicker: "Loại truyện",
    title: "Loại nội dung",
    description: "Tiểu thuyết, truyện ngắn, fanfic và các loại khác.",
    emptyMessage: "Chưa có loại truyện nào đủ truyện để hiển thị.",
    metadataTitle: "Loại truyện | ChapMee",
    metadataDescription: "Tìm truyện theo loại nội dung."
  },
  "do-tuoi": {
    type: "age_rating",
    pathname: "/do-tuoi",
    kicker: "Độ tuổi",
    title: "Phân loại độ tuổi",
    description: "Chọn mức độ tuổi phù hợp trước khi đọc.",
    emptyMessage: "Chưa có nhãn độ tuổi nào đủ truyện để hiển thị.",
    metadataTitle: "Độ tuổi truyện | ChapMee",
    metadataDescription: "Tìm truyện theo phân loại độ tuổi nội dung."
  }
};

export const TAXONOMY_INDEX_PATHNAMES = Object.values(TAXONOMY_INDEX_CONFIG).map(
  (item) => item.pathname
);

export function getTaxonomyIndexConfigForType(type: TaxonomyType) {
  return Object.values(TAXONOMY_INDEX_CONFIG).find((item) => item.type === type) ?? null;
}

export function getTaxonomyIndexPathForType(type: TaxonomyType): string | null {
  return getTaxonomyIndexConfigForType(type)?.pathname ?? null;
}
