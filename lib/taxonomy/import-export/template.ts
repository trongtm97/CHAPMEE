import { TAXONOMY_EXPORT_COLUMNS, rowToCsvLine } from "@/lib/taxonomy/import-export/columns";
import { TAXONOMY_VALID_TYPES_TEXT, COMPOSER_BLOCK_EXAMPLES } from "@/lib/taxonomy/import-export/constants";
import { TAXONOMY_TYPES } from "@/types/taxonomy";

export const TAXONOMY_IMPORT_INSTRUCTIONS = `# Hướng dẫn import taxonomy (Admin)

ĐÂY LÀ IMPORT TAXONOMY ADMIN — KHÔNG PHẢI import truyện/chương Studio Composer.

## Valid types
${TAXONOMY_VALID_TYPES_TEXT}

## Quan trọng — KHÔNG nhập Composer block types
Các giá trị sau là block Composer, KHÔNG phải taxonomy term:
${COMPOSER_BLOCK_EXAMPLES.join(", ")} và toàn bộ COMPOSER_BLOCK_TYPES.

- presentation_mode trong taxonomy = mode truyện/chương ở cấp phân loại.
- Không nhầm với block schema hay structured_content_json.

## Aliases
Phân tách bằng dấu | hoặc ;
Ví dụ: ngon tinh|truyen ngon tinh|love story

## Slug
- Unique theo (type, slug)
- Chỉ chữ thường, số, dấu gạch ngang
- parent_slug phải tồn tại trong DB hoặc cùng file import

## Parent
- subgenre: parent_type = main_genre, parent_slug = slug thể loại cha
- Không tạo vòng lặp parent

## Import modes
- create_only: chỉ tạo mới
- update_by_type_slug: chỉ cập nhật term đã có
- upsert_by_type_slug: có thì update, chưa có thì tạo
- disable_missing_in_file: term active cùng type nhưng không có trong file → is_active=false (cần confirm)

## SEO / flags
- seo_indexable: true/false
- sitemap_priority: 0–1
- editorial_tag, monetization_access: không creator_selectable
- content_warning: nên use_for_moderation=true
- presentation_mode creator_selectable=true: slug phải map ComposerMode hợp lệ
`;

export const TAXONOMY_CSV_TEMPLATE_ROWS = [
  {
    type: "main_genre",
    parent_type: "",
    parent_slug: "",
    name: "Ví dụ thể loại",
    slug: "vi-du-the-loai",
    description: "Mô tả ngắn",
    display_label: "",
    aliases: "",
    icon: "",
    color: "",
    is_active: "true",
    is_public: "true",
    is_selectable_by_creator: "true",
    is_featured: "false",
    use_for_seo: "true",
    use_for_discover: "true",
    use_for_ranking: "true",
    use_for_moderation: "false",
    sort_order: "0",
    seo_title: "",
    seo_description: "",
    seo_h1: "",
    seo_intro: "",
    seo_indexable: "true",
    sitemap_priority: "0.5",
    sitemap_changefreq: "weekly",
    canonical_path: "",
    internal_note: ""
  },
  {
    type: "subgenre",
    parent_type: "main_genre",
    parent_slug: "vi-du-the-loai",
    name: "Thể loại phụ mẫu",
    slug: "the-loai-phu-mau",
    description: "",
    display_label: "",
    aliases: "",
    icon: "",
    color: "",
    is_active: "true",
    is_public: "true",
    is_selectable_by_creator: "true",
    is_featured: "false",
    use_for_seo: "true",
    use_for_discover: "true",
    use_for_ranking: "true",
    use_for_moderation: "false",
    sort_order: "10",
    seo_title: "",
    seo_description: "",
    seo_h1: "",
    seo_intro: "",
    seo_indexable: "true",
    sitemap_priority: "",
    sitemap_changefreq: "",
    canonical_path: "",
    internal_note: ""
  },
  {
    type: "presentation_mode",
    parent_type: "",
    parent_slug: "",
    name: "Chat story",
    slug: "chat_story",
    description: "Trình bày dạng chat",
    display_label: "",
    aliases: "",
    icon: "",
    color: "",
    is_active: "true",
    is_public: "true",
    is_selectable_by_creator: "true",
    is_featured: "false",
    use_for_seo: "true",
    use_for_discover: "true",
    use_for_ranking: "false",
    use_for_moderation: "false",
    sort_order: "0",
    seo_title: "",
    seo_description: "",
    seo_h1: "",
    seo_intro: "",
    seo_indexable: "true",
    sitemap_priority: "",
    sitemap_changefreq: "",
    canonical_path: "",
    internal_note: ""
  }
];

export function buildTaxonomyTemplateCsv(): string {
  const lines = [TAXONOMY_EXPORT_COLUMNS.join(",")];
  for (const row of TAXONOMY_CSV_TEMPLATE_ROWS) {
    lines.push(
      rowToCsvLine(
        TAXONOMY_EXPORT_COLUMNS.map((col) => String(row[col as keyof typeof row] ?? ""))
      )
    );
  }
  return lines.join("\n");
}

export function buildTaxonomyValidTypesCsv(): string {
  return ["type", ...TAXONOMY_TYPES].join("\n");
}
