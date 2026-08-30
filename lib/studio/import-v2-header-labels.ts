import {
  CHAPTERS_IMPORT_V2_HEADERS,
  STORIES_IMPORT_V2_HEADERS,
  TAXONOMY_REFERENCE_HEADERS
} from "@/types/studio-import-v2";
import { STORY_SOURCE_LANGUAGE_OPTIONS } from "@/lib/creator/story-source-languages";
import {
  IMPORT_CONTENT_ORIGIN_GUIDE,
  IMPORT_TRANSLATION_TYPE_GUIDE
} from "@/lib/studio/import-field-value-guide";

const LANGUAGE_HINT = STORY_SOURCE_LANGUAGE_OPTIONS.map(
  (option) => `${option.label}=${option.value}`
).join("; ");

const ORIGIN_HINT = IMPORT_CONTENT_ORIGIN_GUIDE.map(
  (entry) => `${entry.vietnamese}=${entry.value}`
).join("; ");

const TRANSLATION_TYPE_HINT = IMPORT_TRANSLATION_TYPE_GUIDE.map(
  (entry) => `${entry.vietnamese}=${entry.value}`
).join("; ");

export const STORIES_IMPORT_V2_HEADER_LABELS: Record<
  (typeof STORIES_IMPORT_V2_HEADERS)[number],
  string
> = {
  story_code: "Mã CM-ST-… — chỉ điền khi CẬP NHẬT truyện có sẵn",
  story_structure_type: "chaptered (nhiều chương) | standalone (một phần)",
  content_format: "Định dạng: prose — tuỳ chọn",
  title: "Tiêu đề truyện — BẮT BUỘC khi tạo mới",
  slug: "Slug URL — để trống = tự tạo",
  hook: "Hook thu hút — tuỳ chọn",
  description: "Mô tả ngắn — tuỳ chọn",
  long_description: "Mô tả dài — tuỳ chọn",
  cover_url:
    "Link ảnh bìa https — tự tải về media ChapMee khi import (tối thiểu 600×600, dưới 8MB)",
  seo_title: "Tiêu đề SEO — tuỳ chọn",
  seo_description: "Meta description — tuỳ chọn",
  content_origin: `Nguồn truyện — ${ORIGIN_HINT}. Để trống = Sáng tác`,
  source_title: "Tên tác phẩm gốc (truyện dịch) — tuỳ chọn",
  source_author_name: "Tác giả gốc — tuỳ chọn",
  original_language: `Ngôn ngữ gốc — TUỲ CHỌN. ${LANGUAGE_HINT}`,
  source_url: "URL nguồn — tuỳ chọn khi nhập, bổ sung sau trong Studio",
  translation_type: `Loại dịch — ${TRANSLATION_TYPE_HINT}`,
  content_type_slug: "Loại nội dung — tên VN (vd: Truyện dài). Sai = bỏ qua",
  main_genre_slug: "Thể loại chính — tên VN (vd: Ngôn tình). Sai = bỏ qua",
  subgenre_slugs: "Thể loại phụ — dấu phẩy. Tag sai = bỏ qua tag đó",
  trope_tag_slugs: "Chủ đề/motif — dấu phẩy",
  setting_tag_slugs: "Bối cảnh — dấu phẩy",
  character_tag_slugs: "Kiểu nhân vật — dấu phẩy",
  relationship_tag_slugs: "Quan hệ/tình cảm — dấu phẩy",
  narrative_style_slugs: "Cách kể — dấu phẩy",
  reader_experience_slugs: "Cảm giác đọc — dấu phẩy",
  presentation_mode: "Cách trình bày (vd: Văn xuôi). Sai = bỏ qua",
  age_rating_slug: "Độ tuổi (vd: 13+). Sai = bỏ qua",
  has_content_warning: "Có cảnh báo: true | false | có | không",
  content_warning_slugs: "Cảnh báo nội dung — dấu phẩy",
  publish_at: "Lịch đăng ISO — tuỳ chọn",
  is_completed: "Đã hoàn thành: true | false",
  free_first_chapters_count: "Số chương đầu miễn phí",
  auto_pricing_enabled: "Tự định giá: true | false",
  auto_price_coin: "Giá coin tự động",
  full_access_enabled: "Bật gói đọc trọn: true | false",
  full_access_price_coin: "Giá coin đọc trọn",
  full_access_includes_future_chapters: "Gói trọn gồm chương tương lai",
  default_new_chapter_price_coin: "Giá mặc định chương mới",
  full_access_note: "Ghi chú gói đọc trọn",
  standalone_content: "Nội dung standalone (plain text)",
  standalone_content_json: "JSON standalone — lỗi = bỏ qua",
  standalone_price: "Giá standalone (coin)"
};

export const CHAPTERS_IMPORT_V2_HEADER_LABELS: Record<
  (typeof CHAPTERS_IMPORT_V2_HEADERS)[number],
  string
> = {
  story_code: "Mã truyện ChapMee — BẮT BUỘC",
  chapter_code: "Mã chương CM-CH-… — chỉ điền khi CẬP NHẬT chương có sẵn",
  chapter_order: "Số thứ tự chương (1, 2, 3…) — BẮT BUỘC",
  title: "Tiêu đề chương — tuỳ chọn",
  content: "Nội dung chương (plain text) — hoặc dùng structured_content_json",
  structured_content_json: "Nội dung structured (JSON)",
  presentation_mode: "Override cách trình bày — tuỳ chọn",
  status: "Trạng thái: draft | published | …",
  publish_at: "Lịch đăng chương (ISO)",
  price_coin: "Giá coin chương",
  is_free: "Miễn phí: true/false"
};

export const TAXONOMY_REFERENCE_HEADER_LABELS: Record<
  (typeof TAXONOMY_REFERENCE_HEADERS)[number],
  string
> = {
  type: "Loại taxonomy",
  name: "Tên hiển thị",
  slug: "Slug dùng trong file import",
  description: "Mô tả",
  parent_slug: "Slug thể loại cha",
  max_select_hint: "Giới hạn chọn tối đa"
};

export function buildHeaderLabelRow(
  headers: readonly string[],
  labels: Record<string, string>
): string[] {
  return headers.map((header) => labels[header] ?? header);
}

export function isVietnameseLabelRow(
  headers: string[],
  cells: string[],
  labels: Record<string, string>
): boolean {
  if (cells.length === 0 || headers.length === 0) {
    return false;
  }

  let matches = 0;
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const expected = labels[header]?.trim();
    const actual = String(cells[index] ?? "").trim();
    if (expected && actual === expected) {
      matches += 1;
    }
  }

  return matches >= Math.max(2, Math.floor(headers.length * 0.35));
}

export function resolveImportHeaderLabels(
  headers: string[]
): Record<string, string> | null {
  if (headers.includes("chapter_order") && headers.includes("story_code")) {
    return CHAPTERS_IMPORT_V2_HEADER_LABELS;
  }

  if (
    headers.includes("title") &&
    !headers.includes("chapter_order")
  ) {
    return STORIES_IMPORT_V2_HEADER_LABELS;
  }

  if (headers.includes("type") && headers.includes("slug") && headers.includes("name")) {
    return TAXONOMY_REFERENCE_HEADER_LABELS;
  }

  return null;
}
