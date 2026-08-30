import { createClient } from "@/lib/data/server";
import { mapTemplateRow } from "@/lib/studio/map-template-row";
import { buildTemplatePreview } from "@/lib/studio/template-content";
import type {
  StudioTemplateListItem,
  StudioTemplateTab,
  StudioTemplateTypeFilter
} from "@/types/templates";
import { STUDIO_TEMPLATE_TYPES } from "@/types/templates";

export function normalizeTemplateTypeFilter(
  value: string | undefined
): StudioTemplateTypeFilter {
  if (!value || value === "all") {
    return "all";
  }

  return STUDIO_TEMPLATE_TYPES.includes(value as (typeof STUDIO_TEMPLATE_TYPES)[number])
    ? (value as StudioTemplateTypeFilter)
    : "all";
}

type GetTemplatesInput = {
  ownerId: string;
  tab: StudioTemplateTab;
  typeFilter: StudioTemplateTypeFilter;
  search?: string;
};

export async function getStudioTemplatesPage(input: GetTemplatesInput) {
  const db = await createClient();
  const search = (input.search ?? "").trim();

  let query = db
    .from("creator_templates")
    .select(
      "id, owner_id, template_type, title, description, content, plain_text, is_system, status, created_at, updated_at"
    )
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (input.tab === "system") {
    query = query.eq("is_system", true);
  } else {
    query = query.eq("owner_id", input.ownerId).eq("is_system", false);
  }

  if (input.typeFilter !== "all") {
    query = query.eq("template_type", input.typeFilter);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%,plain_text.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message, templates: [] as StudioTemplateListItem[] };
  }

  const templates = (data ?? []).map((row) => {
    const mapped = mapTemplateRow(row);

    return {
      description: mapped.description,
      id: mapped.id,
      isSystem: mapped.isSystem,
      plainText: buildTemplatePreview(
        mapped.plainText,
        mapped.content.body
      ),
      templateType: mapped.templateType,
      title: mapped.title,
      updatedAt: mapped.updatedAt
    } satisfies StudioTemplateListItem;
  });

  return { error: null, templates };
}

export async function getStudioTemplateById(templateId: string, ownerId: string) {
  const db = await createClient();

  const { data, error } = await db
    .from("creator_templates")
    .select(
      "id, owner_id, template_type, title, description, content, plain_text, is_system, status, created_at, updated_at"
    )
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    return { error: error.message, template: null };
  }

  if (!data) {
    return { error: "Không tìm thấy mẫu.", template: null };
  }

  const mapped = mapTemplateRow(data);

  if (!mapped.isSystem && mapped.ownerId !== ownerId) {
    return { error: "Bạn không có quyền xem mẫu này.", template: null };
  }

  return { error: null, template: mapped };
}
