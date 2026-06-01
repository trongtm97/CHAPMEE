import {
  CHAPTERS_IMPORT_V2_HEADERS,
  STORIES_IMPORT_V2_HEADERS,
  TAXONOMY_REFERENCE_HEADERS
} from "@/types/studio-import-v2";
import { STORY_TAXONOMY_LIMITS } from "@/lib/taxonomy/constants";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import type { TaxonomyCatalog } from "@/lib/studio/taxonomy-catalog";
import type { TaxonomyType } from "@/types/taxonomy";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowToCsv(headers: readonly string[], values: string[]) {
  return [
    headers.join(","),
    values.map(escapeCsv).join(",")
  ].join("\n");
}

export const STUDIO_IMPORT_INSTRUCTIONS = `Hướng dẫn nhập/xuất hàng loạt ChapMee

1. Không tự tạo slug taxonomy mới trong file — chỉ dùng slug có trong sheet taxonomy_reference.
2. Nhiều tag cùng loại: phân tách bằng dấu | (ví dụ: romance|fantasy).
3. Không đổi tên cột header.
4. story_code / chapter_code lấy từ file export ChapMee — dùng khi cập nhật truyện/chương đã có.
5. Muốn thêm tag/thể loại mới: Studio → form truyện → "Yêu cầu thêm tag/thể loại".
6. Import không tạo taxonomy mới — slug không tồn tại sẽ báo lỗi.
6b. story_structure_type: chaptered (nhiều chương) hoặc standalone (một phần). Standalone dùng standalone_content / standalone_content_json — không bắt buộc chapter rows.
7. Chương: price_coin + is_free (true/false) — cập nhật monetization chương.
7b. Chương (tùy chọn): content_format (plain_text | structured_json), structured_content_json (JSON theo presentation_mode của truyện), presentation_mode (override chương).
8. Truyện (tùy chọn): free_first_chapters_count, auto_pricing_enabled, auto_price_coin, full_access_*.
9. Xuất XLSX/ZIP: nhiều sheet — stories, chapters, taxonomy_reference.
10. full_access_note: ghi chú ngắn cho gói đọc trọn (tối đa ~500 ký tự).

Giới hạn (mỗi truyện):
- subgenre: tối đa ${STORY_TAXONOMY_LIMITS.subgenre?.max ?? 3}
- trope_tag: tối đa ${STORY_TAXONOMY_LIMITS.trope_tag?.max ?? 12}
- setting_tag: tối đa ${STORY_TAXONOMY_LIMITS.setting_tag?.max ?? 5}
`;

export function buildStoriesTemplateCsv(mode: "create" | "update") {
  const sample: Record<(typeof STORIES_IMPORT_V2_HEADERS)[number], string> = {
    external_key: "story-001",
    story_code: mode === "update" ? "CM-ST-XXXXXX" : "",
    story_structure_type: "chaptered",
    content_format: "prose",
    title: "Tên truyện mẫu",
    slug: "",
    description: "Mô tả ngắn",
    content_type_slug: "novel",
    main_genre_slug: "romance",
    subgenre_slugs: "slow-burn",
    trope_tag_slugs: "enemies-to-lovers",
    setting_tag_slugs: "modern-city",
    character_tag_slugs: "",
    relationship_tag_slugs: "",
    narrative_style_slugs: "",
    reader_experience_slugs: "",
    presentation_mode: "standard_prose",
    age_rating_slug: "teen",
    has_content_warning: "false",
    content_warning_slugs: "",
    status: "draft",
    publish_at: "",
    is_completed: "false",
    free_first_chapters_count: "3",
    auto_pricing_enabled: "false",
    auto_price_coin: "",
    full_access_enabled: "false",
    full_access_price_coin: "",
    full_access_includes_future_chapters: "true",
    default_new_chapter_price_coin: "10",
    full_access_note: "",
    standalone_content: "",
    standalone_content_json: "",
    standalone_price: ""
  };

  return rowToCsv(STORIES_IMPORT_V2_HEADERS, STORIES_IMPORT_V2_HEADERS.map((h) => sample[h]));
}

export const STUDIO_TAXONOMY_QA_CHECKLIST = `Checklist QA — Studio taxonomy & import/export

Form truyện
[ ] Chọn content_type, main_genre, age_rating, presentation_mode — lưu thành công
[ ] Subgenre lọc theo main_genre; không vượt giới hạn tag
[ ] Cảnh báo nội dung + checkbox xác nhận bắt buộc
[ ] Mẫu format hiển thị khi đổi presentation_mode
[ ] Gửi yêu cầu tag mới (không tự tạo slug)

Danh sách /studio/stories
[ ] Lọc theo thể loại taxonomy, content type, format, cảnh báo
[ ] Sort theo thể loại chính A–Z
[ ] Bulk: gắn / gỡ / thay thế tag; xuất CSV taxonomy

Import v2 (/studio/import)
[ ] Template ZIP/XLSX tải được
[ ] Import CSV truyện — slug lỗi báo lỗi, không tạo tag mới
[ ] Import CSV/XLSX chương — story_code + chapter_order
[ ] Import XLSX 2 sheet — Import tất cả sheet
[ ] Lịch sử: server + trình duyệt

Export
[ ] Truyện / Chương / Truyện+chương CSV v2
[ ] ZIP và XLSX bundle theo phạm vi truyện
`;

export function buildChaptersTemplateCsv() {
  const sample: Record<(typeof CHAPTERS_IMPORT_V2_HEADERS)[number], string> = {
    external_key: "ch-001",
    story_external_key: "story-001",
    story_code: "",
    chapter_code: "",
    chapter_order: "1",
    title: "Chương 1",
    slug: "",
    content: "Nội dung chương...",
    content_format: "plain_text",
    structured_content_json: "",
    validation_status: "",
    presentation_mode: "",
    status: "draft",
    publish_at: "",
    price_coin: "",
    is_free: "true"
  };

  return rowToCsv(
    CHAPTERS_IMPORT_V2_HEADERS,
    CHAPTERS_IMPORT_V2_HEADERS.map((h) => sample[h])
  );
}

export function buildTaxonomyReferenceCsv(catalog: TaxonomyCatalog) {
  const lines = [TAXONOMY_REFERENCE_HEADERS.join(",")];

  for (const type of Object.keys(catalog.byType) as TaxonomyType[]) {
    const limit = STORY_TAXONOMY_LIMITS[type]?.max;
    const hint =
      limit != null ? String(limit) : STORY_TAXONOMY_LIMITS[type]?.min === 1 ? "1" : "";

    for (const term of catalog.byType[type] ?? []) {
      const parentSlug =
        term.parent_id && catalog.byType.main_genre
          ? (catalog.byType.main_genre.find((g) => g.id === term.parent_id)?.slug ?? "")
          : "";

      lines.push(
        [
          type,
          term.name,
          term.slug,
          term.description ?? "",
          parentSlug,
          hint
        ]
          .map(escapeCsv)
          .join(",")
      );
    }
  }

  return lines.join("\n");
}

export function buildInstructionsWithLabels() {
  const limits = Object.entries(STORY_TAXONOMY_LIMITS)
    .filter(([, rule]) => rule?.max)
    .map(
      ([type, rule]) =>
        `- ${TAXONOMY_TYPE_LABELS[type as TaxonomyType]}: tối đa ${rule!.max}`
    )
    .join("\n");

  return `${STUDIO_IMPORT_INSTRUCTIONS}\n\nNhóm có giới hạn:\n${limits}`;
}
