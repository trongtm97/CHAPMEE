import {
  CHAPTERS_IMPORT_V2_HEADERS,
  STORIES_IMPORT_V2_HEADERS,
  TAXONOMY_REFERENCE_HEADERS
} from "@/types/studio-import-v2";
import {
  DEPRECATED_CONTENT_TYPE_SLUGS,
  NON_STORY_CONTENT_TYPE_SLUGS,
  STORY_FORM_CONTENT_TYPE_SLUGS,
  STORY_TAXONOMY_LIMITS,
  TAXONOMY_TYPE_LABELS
} from "@/lib/taxonomy/constants";
import { sortTaxonomyTermsForPicker } from "@/lib/taxonomy/sort-terms-for-picker";
import { exportRowsToCsv } from "@/lib/studio/csv";
import {
  isSuspiciousMojibake,
  repairCommonVietnameseMojibake
} from "@/lib/encoding/mojibake-repair";
import { buildImportFieldValuesInstructionBlock } from "@/lib/studio/import-field-value-guide";
import type { TaxonomyCatalog } from "@/lib/studio/taxonomy-catalog";
import type { TaxonomyType } from "@/types/taxonomy";

const EXCLUDED_CONTENT_TYPE_SLUGS = new Set<string>([
  ...DEPRECATED_CONTENT_TYPE_SLUGS,
  ...NON_STORY_CONTENT_TYPE_SLUGS
]);

const ALLOWED_STORY_CONTENT_TYPE_SLUGS = new Set<string>(STORY_FORM_CONTENT_TYPE_SLUGS);

function importDisplayText(value: string): string {
  if (!value) return value;
  return isSuspiciousMojibake(value) ? repairCommonVietnameseMojibake(value) : value;
}

function toCsvRow(
  headers: readonly string[],
  values: Record<string, string>
): string {
  return exportRowsToCsv([...headers], [values]);
}

export const STUDIO_IMPORT_INSTRUCTIONS = `Hướng dẫn nhập/xuất hàng loạt ChapMee (Import v2)

══ Tổng quan ══
• File XLSX mẫu có 2 dòng tiêu đề: dòng 1 = tên cột kỹ thuật (tiếng Anh, KHÔNG sửa); dòng 2 = giải thích tiếng Việt (chỉ để đọc, hệ thống tự bỏ qua khi import).
• File CSV chỉ có dòng tiêu đề tiếng Anh — dùng khi chỉnh bằng editor hỗ trợ UTF-8.
• Lưu UTF-8 (Excel: CSV UTF-8) hoặc dùng XLSX. Hệ thống tự nhận dấu phân cách , hoặc ;, hỗ trợ UTF-16 / Windows-1258 từ Excel.
• Sheet taxonomy_reference: tra slug thể loại/tag — không tự tạo slug mới trong file import.
• Nhiều tag cùng loại trong một ô: phân tách bằng dấu phẩy (vd: Ngọt sủng, Hài hước) hoặc chấm phẩy (vd: Ngọt sủng; Hài hước) — Excel VN thường dùng ; giữa các cột, nên ; trong ô là an toàn.
• File CSV: lưu UTF-8 (Excel: CSV UTF-8) hoặc dùng XLSX. Dòng 2 tiếng Việt (trong template XLSX) sẽ tự bỏ qua khi import.
• Cột taxonomy: có thể dán tên tiếng Việt trực tiếp — hệ thống tự khớp slug (xem sheet taxonomy_reference).
• story_code / chapter_code: lấy từ file export ChapMee — dùng khi cập nhật truyện/chương đã có.
• Muốn thêm tag mới: Studio → form truyện → "Yêu cầu thêm tag/thể loại".
• Trường sai/không khớp → bỏ qua trường đó, vẫn tạo truyện NHÁP.
• Chỉ bỏ qua cả dòng khi thiếu title (tạo mới) hoặc story_code không tồn tại (cập nhật).

══ Sheet TRUYỆN (stories) — tối thiểu để tạo nháp ══
title                  Tiêu đề truyện (bắt buộc khi tạo mới)
Các cột taxonomy / dịch / SEO… đều tuỳ chọn — xem sheet field_values_reference

══ Sheet TRUYỆN (stories) — taxonomy khuyến nghị (sai = bỏ qua, vẫn nháp) ══
content_type_slug      Loại nội dung (vd: Truyện dài)
main_genre_slug        Thể loại chính (vd: Ngôn tình)
presentation_mode      Cách trình bày (vd: Văn xuôi truyền thống)
age_rating_slug        Độ tuổi (vd: 13+)
external_key           Mã nội bộ tự đặt — liên kết với story_external_key ở sheet chương
story_code             Mã ChapMee (CM-ST-…) — bắt buộc khi cập nhật truyện cũ
story_structure_type   chaptered (nhiều chương) | standalone (một phần)
content_format         Định dạng: prose, …
slug                   Slug URL — để trống sẽ tự tạo khi thêm mới
hook                   Câu hook thu hút độc giả (hiển thị ngoài trang truyện)
description            Mô tả ngắn
long_description       Mô tả dài (nội dung trang truyện)
cover_url              Link ảnh bìa https công khai — hệ thống TỰ TẢI về media ChapMee khi import
seo_title              Tiêu đề SEO (thẻ title)
seo_description        Meta description cho Google

══ Sheet TRUYỆN — truyện dịch (xem sheet field_values_reference) ══
content_origin         Sáng tác=original | Dịch=translation (có thể ghi tiếng Việt: sáng tác, dịch)
source_title           Tên tác phẩm gốc — tuỳ chọn
source_author_name     Tác giả gốc — tuỳ chọn
original_language      TUỲ CHỌN khi nhập — ghi mã (zh-CN, en, ja…) hoặc tên tiếng Việt trong sheet field_values_reference
source_url             TUỲ CHỌN khi nhập — bổ sung sau trong Studio
translation_type       Loại dịch — xem sheet field_values_reference (mặc định fan_translation)
Lưu ý: Truyện dịch tự áp dụng chính sách miễn phí đọc 100%.

══ Sheet TRUYỆN — taxonomy (tên tiếng Việt hoặc slug, phân tách bằng dấu phẩy) ══
subgenre_slugs         Thể loại phụ (vd: Ngọt sủng, Hài hước)
trope_tag_slugs        Chủ đề/motif
setting_tag_slugs      Bối cảnh
character_tag_slugs    Kiểu nhân vật
relationship_tag_slugs Quan hệ/tình cảm
narrative_style_slugs  Cách kể
reader_experience_slugs Cảm giác đọc
has_content_warning    true | false
content_warning_slugs  Cảnh báo nội dung (phân tách bằng dấu phẩy)

══ Sheet TRUYỆN — trạng thái & monetization ══
status                 draft | published | …
publish_at             Lịch đăng ISO 8601 (tuỳ chọn)
is_completed           true | false
free_first_chapters_count Số chương đầu miễn phí
auto_pricing_enabled   true | false
auto_price_coin        Giá coin tự động cho chương mới
full_access_enabled    Bật gói đọc trọn
full_access_price_coin Giá coin đọc trọn
full_access_includes_future_chapters true | false
default_new_chapter_price_coin Giá mặc định chương mới
full_access_note       Ghi chú gói đọc trọn (tối đa ~500 ký tự)

══ Sheet TRUYỆN — standalone (khi story_structure_type=standalone) ══
standalone_content         Nội dung plain text
standalone_content_json    Nội dung JSON structured
standalone_price           Giá coin (nếu có)

══ Sheet CHƯƠNG (chapters) ══
story_code             BẮT BUỘC — mã truyện ChapMee
chapter_order          BẮT BUỘC — số thứ tự chương (1, 2, 3, …)
title                  Tiêu đề chương
content                Nội dung plain text — hoặc dùng structured_content_json
structured_content_json JSON nội dung theo presentation_mode của truyện
content_format         plain_text | structured_json | structured_blocks
presentation_mode      Override cách trình bày (tuỳ chọn)
chapter_code           Mã chương ChapMee — dùng khi cập nhật chương cũ
external_key           Mã nội bộ chương
story_external_key     Mã nội bộ truyện (liên kết với external_key truyện)
slug                   Slug chương
status                 draft | published | …
publish_at             Lịch đăng
price_coin             Giá coin chương
is_free                true | false

══ Sheet taxonomy_reference ══
type                   Loại taxonomy (content_type, main_genre, subgenre, …)
name                   Tên hiển thị tiếng Việt
slug                   Slug copy vào file import
description            Mô tả tag
parent_slug            Slug thể loại cha (subgenre)
max_select_hint        Giới hạn chọn tối đa mỗi truyện

══ Quy trình gợi ý ══
1. Tải XLSX mẫu hoặc ZIP.
2. Đọc dòng tiếng Việt (dòng 2) để hiểu từng cột.
3. Điền dữ liệu từ dòng 3 trở đi; tra slug tại sheet taxonomy_reference.
4. Preview trước khi Import — dòng vàng = vẫn import nháp (một số trường bị bỏ qua); đỏ = không import được.
5. File XLSX nhiều sheet: dùng "Import tất cả sheet" hoặc chọn từng sheet.
6. Sheet field_values_reference: danh sách giá trị cột chọn (ngôn ngữ, nguồn truyện, loại dịch…).
`;
export function buildStoriesTemplateCsv(mode: "create" | "update") {
  const sample: Record<(typeof STORIES_IMPORT_V2_HEADERS)[number], string> = {
    story_code: mode === "update" ? "CM-ST-XXXXXX" : "",
    story_structure_type: "chaptered",
    content_format: "prose",
    title: "Tên truyện mẫu",
    slug: "",
    hook: "Câu hook thu hút độc giả",
    description: "Mô tả ngắn",
    long_description: "Mô tả dài cho trang truyện",
    cover_url: "",
    seo_title: "",
    seo_description: "",
    content_origin: "Sáng tác",
    source_title: "",
    source_author_name: "",
    original_language: "",
    source_url: "",
    translation_type: "",
    content_type_slug: "Truyện dài",
    main_genre_slug: "Ngôn tình",
    subgenre_slugs: "",
    trope_tag_slugs: "",
    setting_tag_slugs: "",
    character_tag_slugs: "",
    relationship_tag_slugs: "",
    narrative_style_slugs: "",
    reader_experience_slugs: "",
    presentation_mode: "",
    age_rating_slug: "",
    has_content_warning: "false",
    content_warning_slugs: "",
    publish_at: "",
    is_completed: "false",
    free_first_chapters_count: "",
    auto_pricing_enabled: "",
    auto_price_coin: "",
    full_access_enabled: "",
    full_access_price_coin: "",
    full_access_includes_future_chapters: "",
    default_new_chapter_price_coin: "",
    full_access_note: "",
    standalone_content: "",
    standalone_content_json: "",
    standalone_price: ""
  };

  return exportRowsToCsv([...STORIES_IMPORT_V2_HEADERS], [sample]);
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
    story_code: "CM-ST-XXXXXX",
    chapter_code: "",
    chapter_order: "1",
    title: "Chương 1",
    content: "Nội dung chương...",
    structured_content_json: "",
    presentation_mode: "",
    status: "draft",
    publish_at: "",
    price_coin: "",
    is_free: "true"
  };

  return toCsvRow(CHAPTERS_IMPORT_V2_HEADERS, sample);
}

export function buildTaxonomyReferenceCsv(catalog: TaxonomyCatalog) {
  const rows: Array<Record<string, string>> = [];

  for (const type of Object.keys(catalog.byType) as TaxonomyType[]) {
    const limit = STORY_TAXONOMY_LIMITS[type]?.max;
    const hint =
      limit != null ? String(limit) : STORY_TAXONOMY_LIMITS[type]?.min === 1 ? "1" : "";

    let terms = catalog.byType[type] ?? [];

    if (type === "content_type") {
      terms = terms.filter((term) => ALLOWED_STORY_CONTENT_TYPE_SLUGS.has(term.slug));
    }

    terms = terms.filter((term) => !EXCLUDED_CONTENT_TYPE_SLUGS.has(term.slug));
    terms = sortTaxonomyTermsForPicker(terms, type);

    for (const term of terms) {
      const parentSlug =
        term.parent_id && catalog.byType.main_genre
          ? (catalog.byType.main_genre.find((g) => g.id === term.parent_id)?.slug ?? "")
          : "";

      rows.push({
        type,
        name: importDisplayText(term.name),
        slug: term.slug,
        description: importDisplayText(term.description ?? ""),
        parent_slug: parentSlug,
        max_select_hint: hint
      });
    }
  }

  return exportRowsToCsv([...TAXONOMY_REFERENCE_HEADERS], rows);
}

export function buildInstructionsWithLabels() {
  const limits = Object.entries(STORY_TAXONOMY_LIMITS)
    .filter(([, rule]) => rule?.max)
    .map(
      ([type, rule]) =>
        `- ${TAXONOMY_TYPE_LABELS[type as TaxonomyType]}: tối đa ${rule!.max}`
    )
    .join("\n");

  return `${STUDIO_IMPORT_INSTRUCTIONS}

${buildImportFieldValuesInstructionBlock()}

Giới hạn tag (mỗi truyện):
${limits}`;
}
