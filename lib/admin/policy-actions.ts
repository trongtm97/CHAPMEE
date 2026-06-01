"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import {
  archivePolicyPage,
  createPolicyPage,
  publishPolicyPage,
  updatePolicyPage
} from "@/lib/policies/policy-pages";
import type { PolicyListFilters } from "@/lib/policies/parse-policy-filters";
import {
  getPolicyPageStats,
  listPolicyPages,
  listPolicyVersions
} from "@/lib/policies/policy-pages";
import type { CreatePolicyPageInput, UpdatePolicyPageInput } from "@/types/policy-pages";
import type { PermissionCode } from "@/types/permissions";

async function requirePolicyActor(permission: PermissionCode) {
  const guard = await checkStaffPermission(permission);
  if (!guard.ok) {
    return { ok: false as const, error: guard.error ?? "Không có quyền." };
  }
  return { ok: true as const, actorId: guard.userId };
}

export async function listPoliciesForAdminAction(filters: PolicyListFilters) {
  const guard = await checkStaffPermission("policies.view");
  if (!guard.ok) {
    return { items: [], total: 0, error: guard.error ?? "Không có quyền." };
  }

  return listPolicyPages({
    status: filters.status,
    policyType: filters.policyType,
    search: filters.search,
    page: filters.page,
    pageSize: filters.pageSize
  });
}

export async function getPolicyStatsForAdminAction() {
  const guard = await checkStaffPermission("policies.view");
  if (!guard.ok) {
    return { stats: null, error: guard.error ?? "Không có quyền." };
  }
  return getPolicyPageStats();
}

export async function savePolicyPageAction(input: {
  id?: string;
  data: CreatePolicyPageInput | UpdatePolicyPageInput;
}) {
  const permission = input.id ? "policies.edit" : "policies.create";
  const actor = await requirePolicyActor(permission);
  if (!actor.ok) return { item: null, error: actor.error };

  const payload = {
    ...input.data,
    updated_by: actor.actorId,
    ...(input.id ? {} : { created_by: actor.actorId })
  };

  const result = input.id
    ? await updatePolicyPage(input.id, payload)
    : await createPolicyPage(payload as CreatePolicyPageInput);

  if (result.item) {
    await logAdminAction({
      actorId: actor.actorId,
      action: input.id ? "policy_update" : "policy_create",
      targetType: "policy_page",
      targetId: result.item.id,
      metadata: { slug: result.item.slug, title: result.item.title }
    });
    revalidatePath("/admin/policies");
    revalidatePath("/chinh-sach");
  }

  return result;
}

export async function publishPolicyPageAction(id: string, changeNote?: string | null) {
  const actor = await requirePolicyActor("policies.publish");
  if (!actor.ok) return { item: null, error: actor.error };

  const result = await publishPolicyPage(id, actor.actorId, changeNote);
  if (result.item) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "policy_publish",
      targetType: "policy_page",
      targetId: result.item.id,
      metadata: { version: result.item.version, slug: result.item.slug }
    });
    revalidatePath("/admin/policies");
    revalidatePath("/chinh-sach");
    revalidatePath(result.item.canonical_path ?? `/chinh-sach/${result.item.slug}`);
  }
  return result;
}

export async function archivePolicyPageAction(id: string) {
  const actor = await requirePolicyActor("policies.publish");
  if (!actor.ok) return { item: null, error: actor.error };

  const result = await archivePolicyPage(id, actor.actorId);
  if (result.item) {
    await logAdminAction({
      actorId: actor.actorId,
      action: "policy_archive",
      targetType: "policy_page",
      targetId: result.item.id,
      metadata: { slug: result.item.slug }
    });
    revalidatePath("/admin/policies");
    revalidatePath("/chinh-sach");
  }
  return result;
}

export async function listPolicyVersionsAction(policyId: string) {
  const guard = await checkStaffPermission("policies.version.view");
  if (!guard.ok) {
    return { items: [], error: guard.error ?? "Không có quyền." };
  }
  return listPolicyVersions(policyId);
}
