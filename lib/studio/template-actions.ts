"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioTemplateById } from "@/lib/studio/get-templates";
import { mapTemplateRow } from "@/lib/studio/map-template-row";
import { getTemplateBody } from "@/lib/studio/template-content";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/supabase/server";
import {
  STUDIO_TEMPLATE_TITLE_MAX,
  STUDIO_TEMPLATE_TYPES,
  type StudioTemplateType
} from "@/types/templates";

const TEMPLATES_PATH = studioPath("/templates");

async function getOwnerProfileId() {
  const { profile, user } = await getCurrentUser();

  if (!user?.id || !profile?.id) {
    return { error: "Bạn cần đăng nhập.", profileId: null };
  }

  return { error: null, profileId: profile.id };
}

function validateTemplateInput(input: {
  title: string;
  templateType: string;
  body: string;
}) {
  const title = input.title.trim();

  if (!title) {
    return { error: "Vui lòng nhập tên mẫu.", ok: false as const };
  }

  if (title.length > STUDIO_TEMPLATE_TITLE_MAX) {
    return {
      error: `Tên mẫu tối đa ${STUDIO_TEMPLATE_TITLE_MAX} ký tự.`,
      ok: false as const
    };
  }

  if (!STUDIO_TEMPLATE_TYPES.includes(input.templateType as StudioTemplateType)) {
    return { error: "Loại mẫu không hợp lệ.", ok: false as const };
  }

  const body = input.body.trim();

  if (!body) {
    return { error: "Nội dung mẫu không được để trống.", ok: false as const };
  }

  return {
    ok: true as const,
    values: {
      body,
      plainText: body.replace(/\s+/g, " ").trim(),
      templateType: input.templateType as StudioTemplateType,
      title
    }
  };
}

export async function listTemplatesForPickerAction(input?: {
  search?: string;
  templateType?: StudioTemplateType | "all";
}) {
  const { error, profileId } = await getOwnerProfileId();

  if (!profileId) {
    return { error, templates: [] };
  }

  const supabase = await createClient();
  const search = (input?.search ?? "").trim();
  const typeFilter = input?.templateType ?? "chapter";

  const templates: ReturnType<typeof mapTemplateRow>[] = [];

  let systemQuery = supabase
    .from("creator_templates")
    .select(
      "id, owner_id, template_type, title, description, content, plain_text, is_system, status, created_at, updated_at"
    )
    .eq("is_system", true)
    .eq("status", "active");

  let mineQuery = supabase
    .from("creator_templates")
    .select(
      "id, owner_id, template_type, title, description, content, plain_text, is_system, status, created_at, updated_at"
    )
    .eq("owner_id", profileId)
    .eq("is_system", false)
    .eq("status", "active");

  if (typeFilter !== "all") {
    systemQuery = systemQuery.eq("template_type", typeFilter);
    mineQuery = mineQuery.eq("template_type", typeFilter);
  }

  if (search) {
    const pattern = `title.ilike.%${search}%,description.ilike.%${search}%,plain_text.ilike.%${search}%`;
    systemQuery = systemQuery.or(pattern);
    mineQuery = mineQuery.or(pattern);
  }

  const [{ data: systemRows }, { data: mineRows }] = await Promise.all([
    systemQuery.order("title", { ascending: true }),
    mineQuery.order("updated_at", { ascending: false })
  ]);

  for (const row of systemRows ?? []) {
    templates.push(mapTemplateRow(row));
  }

  for (const row of mineRows ?? []) {
    templates.push(mapTemplateRow(row));
  }

  return { error: null, templates };
}

export async function createTemplateAction(input: {
  title: string;
  templateType: string;
  description?: string | null;
  body: string;
}) {
  const { error: authError, profileId } = await getOwnerProfileId();

  if (!profileId) {
    return { error: authError, ok: false as const };
  }

  const validated = validateTemplateInput({
    body: input.body,
    templateType: input.templateType,
    title: input.title
  });

  if (!validated.ok) {
    return { error: validated.error, ok: false as const };
  }

  const supabase = await createClient();
  const content = { body: validated.values.body, format: "plain" as const };

  const { data, error } = await supabase
    .from("creator_templates")
    .insert({
      content,
      description: input.description?.trim() || null,
      is_system: false,
      owner_id: profileId,
      plain_text: validated.values.plainText,
      status: "active",
      template_type: validated.values.templateType,
      title: validated.values.title
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message, ok: false as const };
  }

  revalidatePath(TEMPLATES_PATH);

  return { id: data.id as string, ok: true as const };
}

export async function updateTemplateAction(input: {
  id: string;
  title: string;
  templateType: string;
  description?: string | null;
  body: string;
}) {
  const { error: authError, profileId } = await getOwnerProfileId();

  if (!profileId) {
    return { error: authError, ok: false as const };
  }

  const existing = await getStudioTemplateById(input.id, profileId);

  if (!existing.template || existing.error) {
    return { error: existing.error ?? "Không tìm thấy mẫu.", ok: false as const };
  }

  if (existing.template.isSystem) {
    return { error: "Không thể sửa mẫu của ChapMee.", ok: false as const };
  }

  const validated = validateTemplateInput({
    body: input.body,
    templateType: input.templateType,
    title: input.title
  });

  if (!validated.ok) {
    return { error: validated.error, ok: false as const };
  }

  const supabase = await createClient();
  const content = { body: validated.values.body, format: "plain" as const };

  const { error } = await supabase
    .from("creator_templates")
    .update({
      content,
      description: input.description?.trim() || null,
      plain_text: validated.values.plainText,
      template_type: validated.values.templateType,
      title: validated.values.title
    })
    .eq("id", input.id)
    .eq("owner_id", profileId)
    .eq("is_system", false);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  revalidatePath(TEMPLATES_PATH);

  return { ok: true as const };
}

export async function deleteTemplateAction(templateId: string) {
  const { error: authError, profileId } = await getOwnerProfileId();

  if (!profileId) {
    return { error: authError, ok: false as const };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("creator_templates")
    .delete()
    .eq("id", templateId)
    .eq("owner_id", profileId)
    .eq("is_system", false);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  revalidatePath(TEMPLATES_PATH);

  return { ok: true as const };
}

export async function duplicateTemplateAction(templateId: string) {
  const { error: authError, profileId } = await getOwnerProfileId();

  if (!profileId) {
    return { error: authError, ok: false as const };
  }

  const existing = await getStudioTemplateById(templateId, profileId);

  if (!existing.template || existing.error) {
    return { error: existing.error ?? "Không tìm thấy mẫu.", ok: false as const };
  }

  const body = getTemplateBody(existing.template.content);

  return createTemplateAction({
    body,
    description: existing.template.description,
    templateType: existing.template.templateType,
    title: `[Bản sao] ${existing.template.title}`.slice(0, STUDIO_TEMPLATE_TITLE_MAX)
  });
}

export async function getTemplateDetailAction(templateId: string) {
  const { error: authError, profileId } = await getOwnerProfileId();

  if (!profileId) {
    return { error: authError, template: null };
  }

  return getStudioTemplateById(templateId, profileId);
}

export async function getTemplateBodyAction(templateId: string) {
  const { error: authError, profileId } = await getOwnerProfileId();

  if (!profileId) {
    return { body: null, error: authError };
  }

  const result = await getStudioTemplateById(templateId, profileId);

  if (!result.template) {
    return { body: null, error: result.error ?? "Không tìm thấy mẫu." };
  }

  return {
    body: getTemplateBody(result.template.content),
    error: null,
    template: result.template
  };
}
