"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import {
  buildPolicyInsertPayload,
  mapCreatorFeePolicyRow,
  validateCreatorFeePolicyInput
} from "@/lib/admin/creator-fee-policy-shared";
import { requireCreatorFeeCreateAccess } from "@/lib/auth/creator-fee-guards";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import type { CreatorFeePolicyInput } from "@/types/creator-fee-policy";

async function findOverlappingPolicy(
  db: Awaited<ReturnType<typeof createClient>>,
  creatorId: string,
  startsAt: string,
  endsAt: string | null,
  excludeId?: string
) {
  let query = db
    .from("creator_fee_policies")
    .select("id, policy_name, starts_at, ends_at")
    .eq("creator_id", creatorId)
    .in("status", ["active", "scheduled"]);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data } = await query;
  const startTs = new Date(startsAt).getTime();
  const endTs = endsAt ? new Date(endsAt).getTime() : Infinity;

  return (data ?? []).filter((row) => {
    const rowStart = new Date(row.starts_at as string).getTime();
    const rowEnd = row.ends_at ? new Date(row.ends_at as string).getTime() : Infinity;
    return rowStart < endTs && startTs < rowEnd;
  });
}

async function validateCreatorExists(
  db: Awaited<ReturnType<typeof createClient>>,
  creatorId: string
): Promise<string | null> {
  const { data: profile } = await db
    .from("profiles")
    .select("id")
    .eq("id", creatorId)
    .maybeSingle();
  if (!profile) return "Tác giả không tồn tại.";

  const { data: studio } = await db
    .from("creator_monetization_profiles")
    .select("user_id")
    .eq("user_id", creatorId)
    .maybeSingle();

  const { data: stories } = await db
    .from("stories")
    .select("id")
    .eq("author_id", creatorId)
    .limit(1);

  if (!studio && !(stories?.length ?? 0)) {
    return "Người dùng chưa có Studio hoặc chưa là tác giả.";
  }

  return null;
}

export async function createCreatorFeePolicyAction(input: CreatorFeePolicyInput) {
  const access = await requireCreatorFeeCreateAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền tạo chính sách phí." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const validationError = validateCreatorFeePolicyInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const db = await createClient();
  const creatorError = await validateCreatorExists(db, input.creatorId);
  if (creatorError) {
    return { ok: false, error: creatorError };
  }

  const payload = buildPolicyInsertPayload(input, ctx.userId);
  const overlaps = await findOverlappingPolicy(
    db,
    input.creatorId,
    payload.starts_at as string,
    (payload.ends_at as string | null) ?? null
  );

  if (overlaps.length > 0 && !input.confirmOverlap) {
    return {
      ok: false,
      needsConfirm: true,
      error:
        "Tác giả đã có chính sách active/scheduled chồng thời gian. Xác nhận để thay thế policy cũ."
    };
  }

  if (overlaps.length > 0 && input.confirmOverlap) {
    const now = new Date().toISOString();
    await db
      .from("creator_fee_policies")
      .update({ status: "expired", ends_at: now, updated_at: now, updated_by: ctx.userId })
      .eq("creator_id", input.creatorId)
      .in("status", ["active", "scheduled"]);
  }

  const { data, error } = await db
    .from("creator_fee_policies")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.message?.includes("overlapping_creator_fee_policy")) {
      return {
        ok: false,
        needsConfirm: true,
        error:
          "Tác giả đã có chính sách active/scheduled chồng thời gian. Hãy kết thúc policy cũ trước."
      };
    }
    return { ok: false, error: "Không thể tạo chính sách phí." };
  }

  const policy = mapCreatorFeePolicyRow(data as Record<string, unknown>);

  await createAdminAuditLog({
    action: "creator_fee_policy.create",
    targetType: "creator_fee_policy",
    targetId: policy.id,
    note: input.note?.trim() || null,
    after: policy as unknown as Record<string, unknown>,
    metadata: {
      creator_id: input.creatorId,
      actor_user_id: ctx.userId,
      reason: input.note?.trim() || null
    }
  });

  revalidatePath("/admin/creator-fee-policies");
  revalidatePath("/studio/finance");

  return { ok: true, policy };
}
