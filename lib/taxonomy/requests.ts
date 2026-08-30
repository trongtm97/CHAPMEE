import { slugify } from "@/lib/slugify";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/data/server";
import { defaultFlagsForType } from "@/lib/taxonomy/admin-validation";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import { taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import { mapTaxonomyRequestRow } from "@/lib/taxonomy/map-row";
import type { TaxonomyRequestRow, TaxonomyType } from "@/types/taxonomy";

export type CreateTaxonomyRequestInput = {
  type: TaxonomyType;
  name: string;
  description?: string | null;
  exampleUsage?: string | null;
  relatedExistingTermId?: string | null;
};

export async function createTaxonomyRequest(
  userId: string,
  input: CreateTaxonomyRequestInput
): Promise<{ data: TaxonomyRequestRow | null; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { data: null, error: "Vui lòng nhập tên nhãn đề xuất." };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("taxonomy_requests")
    .insert({
      requested_by: userId,
      type: input.type,
      name,
      description: input.description?.trim() || null,
      example_usage: input.exampleUsage?.trim() || null,
      related_existing_term_id: input.relatedExistingTermId ?? null,
      status: "pending"
    })
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: mapTaxonomyRequestRow(data as unknown as Record<string, unknown>),
    error: null
  };
}

async function resolveUniqueTaxonomySlug(type: TaxonomyType, baseSlug: string) {
  const db = await createClient();
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const { data } = await db
      .from("taxonomy_terms")
      .select("id")
      .eq("type", type)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function notifyTaxonomyRequestOutcome(input: {
  userId: string;
  status: "approved" | "rejected" | "merged";
  termName: string;
  type: TaxonomyType;
  termSlug?: string | null;
  adminNote?: string | null;
}) {
  const typeLabel = TAXONOMY_TYPE_LABELS[input.type];
  const titles = {
    approved: "Yêu cầu tag đã được duyệt",
    rejected: "Yêu cầu tag bị từ chối",
    merged: "Yêu cầu tag đã được gộp"
  } as const;

  const bodies = {
    approved: `"${input.termName}" (${typeLabel}) đã được thêm vào danh mục hệ thống.`,
    rejected: `"${input.termName}" (${typeLabel}) không được thêm.${
      input.adminNote ? ` Lý do: ${input.adminNote}` : ""
    }`,
    merged: `"${input.termName}" đã được gộp vào nhãn có sẵn trong ${typeLabel}.`
  } as const;

  const notificationType = {
    approved: "taxonomy_request_approved",
    rejected: "taxonomy_request_rejected",
    merged: "taxonomy_request_merged"
  } as const;

  const publicUrl =
    input.status === "approved" && input.termSlug
      ? taxonomyTermPublicUrl(input.type, input.termSlug, true)
      : null;

  await createNotification(input.userId, notificationType[input.status], {
    title: titles[input.status],
    body: bodies[input.status],
    actionUrl:
      publicUrl ??
      (input.status === "approved" ? "/discover" : "/studio/stories"),
    metadata: {
      taxonomy_request_status: input.status,
      taxonomy_type: input.type,
      term_name: input.termName,
      term_slug: input.termSlug ?? null
    }
  });
}

async function finalizeTaxonomyRequest(
  requestId: string,
  adminId: string,
  patch: {
    status: "approved" | "rejected" | "merged";
    adminNote?: string | null;
    relatedExistingTermId?: string | null;
  }
) {
  const db = await createClient();
  const { data, error } = await db
    .from("taxonomy_requests")
    .update({
      status: patch.status,
      admin_note: patch.adminNote ?? null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      related_existing_term_id: patch.relatedExistingTermId ?? undefined
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  if (!data) {
    return { data: null, error: "Yêu cầu không tồn tại hoặc đã được xử lý." };
  }

  return {
    data: mapTaxonomyRequestRow(data as unknown as Record<string, unknown>),
    error: null
  };
}

export async function approveTaxonomyRequest(
  requestId: string,
  adminId: string,
  options?: { adminNote?: string | null }
): Promise<{ data: TaxonomyRequestRow | null; error: string | null }> {
  const db = await createClient();
  const { data: request, error: loadError } = await db
    .from("taxonomy_requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();

  if (loadError || !request) {
    return {
      data: null,
      error: loadError?.message ?? "Yêu cầu không tồn tại hoặc đã được xử lý."
    };
  }

  const type = request.type as TaxonomyType;
  const baseSlug = slugify(String(request.name));
  const slug = await resolveUniqueTaxonomySlug(type, baseSlug);
  const flags = defaultFlagsForType(type);
  const { error: insertError } = await db.from("taxonomy_terms").insert({
    type: request.type,
    slug,
    name: request.name,
    description: request.description,
    is_selectable_by_creator: flags.is_selectable_by_creator ?? true,
    is_public: true,
    is_active: true,
    use_for_seo: flags.use_for_seo ?? true,
    use_for_discover: flags.use_for_discover ?? true,
    use_for_ranking: flags.use_for_ranking ?? false,
    use_for_moderation: flags.use_for_moderation ?? false,
    created_by: adminId,
    updated_by: adminId
  });

  if (insertError) {
    return { data: null, error: insertError.message };
  }

  const finalized = await finalizeTaxonomyRequest(requestId, adminId, {
    status: "approved",
    adminNote: options?.adminNote
  });

  if (finalized.data) {
    await notifyTaxonomyRequestOutcome({
      userId: String(request.requested_by),
      status: "approved",
      termName: String(request.name),
      type: request.type as TaxonomyType,
      termSlug: slug,
      adminNote: options?.adminNote
    });
  }

  return finalized;
}

export async function rejectTaxonomyRequest(
  requestId: string,
  adminId: string,
  options?: { adminNote?: string | null }
) {
  const note = options?.adminNote?.trim();
  if (!note) {
    return { data: null, error: "Cần ghi chú khi từ chối yêu cầu." };
  }

  const db = await createClient();
  const { data: request } = await db
    .from("taxonomy_requests")
    .select("requested_by, name, type")
    .eq("id", requestId)
    .maybeSingle();

  const finalized = await finalizeTaxonomyRequest(requestId, adminId, {
    status: "rejected",
    adminNote: note
  });

  if (finalized.data && request) {
    await notifyTaxonomyRequestOutcome({
      userId: String(request.requested_by),
      status: "rejected",
      termName: String(request.name),
      type: request.type as TaxonomyType,
      adminNote: note
    });
  }

  return finalized;
}

export async function mergeTaxonomyRequest(
  requestId: string,
  existingTermId: string,
  adminId: string,
  options?: { adminNote?: string | null; aliasFromRequestName?: boolean }
): Promise<{ data: TaxonomyRequestRow | null; error: string | null }> {
  const db = await createClient();

  const [{ data: request }, { data: existing }] = await Promise.all([
    db
      .from("taxonomy_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle(),
    db
      .from("taxonomy_terms")
      .select("id, aliases, type")
      .eq("id", existingTermId)
      .maybeSingle()
  ]);

  if (!request) {
    return { data: null, error: "Yêu cầu không tồn tại hoặc đã được xử lý." };
  }
  if (!existing || existing.type !== request.type) {
    return { data: null, error: "Nhãn đích hợp nhất không hợp lệ." };
  }

  if (options?.aliasFromRequestName !== false) {
    const aliases = Array.isArray(existing.aliases)
      ? (existing.aliases as string[])
      : [];
    const nextAlias = String(request.name).trim();
    if (nextAlias && !aliases.includes(nextAlias)) {
      await db
        .from("taxonomy_terms")
        .update({
          aliases: [...aliases, nextAlias],
          updated_by: adminId
        })
        .eq("id", existingTermId);
    }
  }

  const finalized = await finalizeTaxonomyRequest(requestId, adminId, {
    status: "merged",
    adminNote: options?.adminNote,
    relatedExistingTermId: existingTermId
  });

  if (finalized.data) {
    await notifyTaxonomyRequestOutcome({
      userId: String(request.requested_by),
      status: "merged",
      termName: String(request.name),
      type: request.type as TaxonomyType,
      adminNote: options?.adminNote
    });
  }

  return finalized;
}

export async function updateTaxonomyUsageCounts(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const db = await createClient();
  const { error } = await db.rpc("refresh_taxonomy_usage_counts");
  return { ok: !error, error: error?.message ?? null };
}
