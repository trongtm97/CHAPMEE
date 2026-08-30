import { createClient } from "@/lib/data/server";
import {
  DEFAULT_SEO_METADATA_TEMPLATES,
  SEO_TEMPLATE_VARIABLES
} from "@/lib/seo/default-metadata-templates";
import { SEO_PREVIEW_SAMPLE_DATA } from "@/lib/seo/seo-preview-samples";
import type { SeoMetadataTemplate } from "@/types/admin-seo";

export { DEFAULT_SEO_METADATA_TEMPLATES, SEO_TEMPLATE_VARIABLES };

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
    const db = await createClient();
    const { data, error } = await db
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
    const db = await createClient();
    const { error } = await db.from("seo_metadata_templates").upsert(
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
