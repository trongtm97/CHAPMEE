import { createClient } from "@/lib/supabase/server";
import { SEO_PREVIEW_SAMPLE_DATA } from "@/lib/seo/seo-preview-samples";
import type { SeoMetadataTemplate } from "@/types/admin-seo";

export const DEFAULT_SEO_METADATA_TEMPLATES: Omit<
  SeoMetadataTemplate,
  "id" | "updated_at"
>[] = [
  {
    page_type: "story",
    title_template: "{{story_title}} - Đọc truyện trên {{site_name}}",
    description_template:
      "Đọc {{story_title}} của {{author_name}}. Cập nhật chương mới, lưu truyện và theo dõi tác giả trên {{site_name}}.",
    og_title_template: "{{story_title}} | {{site_name}}",
    og_description_template: "{{short_description}}",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "chapter",
    title_template: "{{story_title}} - {{chapter_title}}",
    description_template:
      "Đọc {{chapter_title}} của truyện {{story_title}} trên {{site_name}}.",
    og_title_template: "{{chapter_title}} - {{story_title}}",
    og_description_template: "Chương {{chapter_number}} · {{story_title}}",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "author",
    title_template: "{{author_name}} - Tác giả trên {{site_name}}",
    description_template:
      "Xem hồ sơ tác giả {{author_name}}, các truyện đã đăng và nội dung mới nhất trên {{site_name}}.",
    og_title_template: "{{author_name}} | {{site_name}}",
    og_description_template: "Hồ sơ tác giả {{author_name}} trên {{site_name}}.",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "content_post",
    title_template: "{{post_title}} - {{site_name}}",
    description_template: "{{post_excerpt}}",
    og_title_template: "{{post_title}}",
    og_description_template: "{{post_excerpt}}",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "reels",
    title_template: "Reels truyện | {{site_name}}",
    description_template: "Xem Reels truyện ngắn, đề xuất và đang lên trên {{site_name}}.",
    og_title_template: "Reels | {{site_name}}",
    og_description_template: "Reels truyện trên {{site_name}}",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "discover",
    title_template: "Khám phá truyện | {{site_name}}",
    description_template: "Tìm truyện, tác giả và thể loại yêu thích trên {{site_name}}.",
    og_title_template: null,
    og_description_template: null,
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  }
];

export const SEO_TEMPLATE_VARIABLES = [
  "site_name",
  "story_title",
  "chapter_title",
  "chapter_number",
  "author_name",
  "category_name",
  "genre_name",
  "reels_title",
  "post_title",
  "post_excerpt",
  "announcement_title",
  "short_description",
  "current_year"
] as const;

function mapTemplate(row: Record<string, unknown>): SeoMetadataTemplate {
  return {
    id: String(row.id),
    page_type: String(row.page_type),
    title_template: row.title_template ? String(row.title_template) : null,
    description_template: row.description_template ? String(row.description_template) : null,
    og_title_template: row.og_title_template ? String(row.og_title_template) : null,
    og_description_template: row.og_description_template
      ? String(row.og_description_template)
      : null,
    twitter_title_template: row.twitter_title_template
      ? String(row.twitter_title_template)
      : null,
    twitter_description_template: row.twitter_description_template
      ? String(row.twitter_description_template)
      : null,
    robots_directive: row.robots_directive ? String(row.robots_directive) : null,
    canonical_mode: row.canonical_mode ? String(row.canonical_mode) : "self",
    is_active: row.is_active === undefined ? true : Boolean(row.is_active),
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };
}

function defaultTemplatesWithIds(): SeoMetadataTemplate[] {
  return DEFAULT_SEO_METADATA_TEMPLATES.map((item, index) => ({
    ...item,
    id: `default-${item.page_type}`,
    updated_at: new Date(0).toISOString()
  }));
}

export async function listSeoMetadataTemplates(): Promise<{
  items: SeoMetadataTemplate[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_metadata_templates")
      .select("*")
      .order("page_type", { ascending: true });

    if (error) {
      if (error.message.includes("does not exist")) {
        return { items: defaultTemplatesWithIds(), error: null };
      }
      return { items: defaultTemplatesWithIds(), error: error.message };
    }

    if (!data?.length) {
      return { items: defaultTemplatesWithIds(), error: null };
    }

    return {
      items: data.map((row) => mapTemplate(row as Record<string, unknown>)),
      error: null
    };
  } catch {
    return { items: defaultTemplatesWithIds(), error: null };
  }
}

export function previewSeoTemplate(
  template: string | null,
  sample: Record<string, string> = {}
): string {
  if (!template) return "";
  return template.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, key: string) => {
    const data: Record<string, string> = {
      ...SEO_PREVIEW_SAMPLE_DATA,
      ...sample
    };
    return data[key] ?? `{{${key}}}`;
  });
}

export function validateSeoTemplateLength(
  title: string | null,
  description: string | null
): string[] {
  const errors: string[] = [];
  if (title) {
    const len = title.length;
    if (len < 30) errors.push("Title ngắn hơn 30 ký tự (khuyến nghị 30–65).");
    if (len > 65) errors.push("Title dài hơn 65 ký tự.");
  }
  if (description) {
    const len = description.length;
    if (len < 80) errors.push("Description ngắn hơn 80 ký tự (khuyến nghị 80–160).");
    if (len > 160) errors.push("Description dài hơn 160 ký tự.");
  }
  return errors;
}

export async function updateSeoMetadataTemplate(
  pageType: string,
  input: Partial<SeoMetadataTemplate>,
  updatedBy?: string | null
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("seo_metadata_templates").upsert(
      {
        page_type: pageType,
        title_template: input.title_template ?? null,
        description_template: input.description_template ?? null,
        og_title_template: input.og_title_template ?? null,
        og_description_template: input.og_description_template ?? null,
        twitter_title_template: input.twitter_title_template ?? null,
        twitter_description_template: input.twitter_description_template ?? null,
        robots_directive: input.robots_directive ?? null,
        canonical_mode: input.canonical_mode ?? "self",
        is_active: input.is_active ?? true,
        updated_by: updatedBy ?? null
      },
      { onConflict: "page_type" }
    );

    if (error?.message.includes("does not exist")) {
      return { error: "Bảng mẫu metadata chưa có — chạy migration 141." };
    }
    return { error: error?.message ?? null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể lưu mẫu metadata."
    };
  }
}
