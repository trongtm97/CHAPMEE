"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import {
  parsePercentsFromForm,
  percentsToCustomJsonb,
  validateRevenueSharePercents
} from "@/lib/admin/creator-revenue-share-utils";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { updateCreatorMonetizationProfile } from "@/lib/supabase/creator-monetization";
import { createClient } from "@/lib/supabase/server";

const REVALIDATE = "/admin/creators";

async function assertCreatorMonetizationStaff() {
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, approverId: null };
  }
  return { ok: true as const, error: null, approverId: auth.userId };
}

function resolveFormData(
  first: FormData | { ok: boolean; error: string | null },
  second?: FormData
) {
  return first instanceof FormData ? first : (second as FormData);
}

async function loadProfileBefore(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("creator_monetization_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function approveCreatorMonetizationAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertCreatorMonetizationStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const profileId = String(formData.get("profile_id") ?? "");
  const confirmed = formData.get("confirm_checklist") === "true";
  if (!confirmed) {
    return { ok: false, error: "Vui lòng xác nhận checklist điều kiện." };
  }

  const before = await loadProfileBefore(profileId);
  const updated = await updateCreatorMonetizationProfile(profileId, {
    status: "approved",
    monetization_enabled: true,
    approved_at: new Date().toISOString(),
    approved_by: auth.approverId,
    rejected_reason: null,
    suspended_reason: null
  });

  if (updated.data && auth.approverId) {
    await createAdminAuditLog({
      actorId: auth.approverId,
      action: "creator_monetization_approve",
      targetType: "creator_monetization",
      targetId: profileId,
      note: String(formData.get("internal_note") ?? "").trim() || null,
      before: before ?? undefined,
      after: updated.data as unknown as Record<string, unknown>,
      metadata: { target_user_id: updated.data.user_id }
    });
    revalidatePath(REVALIDATE);
  }
  return { ok: Boolean(updated.data), error: updated.error };
}

export async function rejectCreatorMonetizationAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertCreatorMonetizationStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const profileId = String(formData.get("profile_id") ?? "");
  const reasonCode = String(formData.get("reason_code") ?? "").trim();
  const publicNote = String(formData.get("public_note") ?? "").trim();
  const internalNote = String(formData.get("internal_note") ?? "").trim();
  if (!reasonCode) {
    return { ok: false, error: "Vui lòng chọn lý do từ chối." };
  }

  const reason = publicNote || reasonCode;
  const before = await loadProfileBefore(profileId);
  const updated = await updateCreatorMonetizationProfile(profileId, {
    status: "rejected",
    monetization_enabled: false,
    rejected_reason: reason
  });

  if (updated.data && auth.approverId) {
    await createAdminAuditLog({
      actorId: auth.approverId,
      action: "creator_monetization_reject",
      targetType: "creator_monetization",
      targetId: profileId,
      note: internalNote || reason,
      before: before ?? undefined,
      after: updated.data as unknown as Record<string, unknown>,
      metadata: {
        target_user_id: updated.data.user_id,
        reason_code: reasonCode,
        public_note: publicNote
      }
    });
    revalidatePath(REVALIDATE);
  }
  return { ok: Boolean(updated.data), error: updated.error };
}

export async function suspendCreatorMonetizationAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertCreatorMonetizationStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const profileId = String(formData.get("profile_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const duration = String(formData.get("duration") ?? "30d");
  if (!reason) {
    return { ok: false, error: "Vui lòng nhập lý do tạm dừng." };
  }

  const before = await loadProfileBefore(profileId);
  const patch: Record<string, unknown> = {
    status: "suspended",
    monetization_enabled: false,
    suspended_reason: `${reason} (${duration})`
  };
  if (formData.get("lock_payout") === "true") {
    patch.payout_enabled = false;
  }
  const updated = await updateCreatorMonetizationProfile(profileId, patch);

  if (updated.data && auth.approverId) {
    await createAdminAuditLog({
      actorId: auth.approverId,
      action: "creator_monetization_suspend",
      targetType: "creator_monetization",
      targetId: profileId,
      note: reason,
      before: before ?? undefined,
      after: updated.data as unknown as Record<string, unknown>,
      metadata: {
        target_user_id: updated.data.user_id,
        duration,
        lock_paid_chapter: formData.get("lock_paid_chapter") === "true",
        lock_tip: formData.get("lock_tip") === "true",
        lock_fan_club: formData.get("lock_fan_club") === "true",
        lock_payout: formData.get("lock_payout") === "true"
      }
    });
    revalidatePath(REVALIDATE);
  }
  return { ok: Boolean(updated.data), error: updated.error };
}

export async function restoreCreatorMonetizationAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertCreatorMonetizationStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const profileId = String(formData.get("profile_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do khôi phục." };

  const before = await loadProfileBefore(profileId);
  const updated = await updateCreatorMonetizationProfile(profileId, {
    status: "approved",
    monetization_enabled: true,
    suspended_reason: null,
    rejected_reason: null
  });

  if (updated.data && auth.approverId) {
    await createAdminAuditLog({
      actorId: auth.approverId,
      action: "creator_monetization_restore",
      targetType: "creator_monetization",
      targetId: profileId,
      note: reason,
      before: before ?? undefined,
      after: updated.data as unknown as Record<string, unknown>,
      metadata: { target_user_id: updated.data.user_id }
    });
    revalidatePath(REVALIDATE);
  }
  return { ok: Boolean(updated.data), error: updated.error };
}

export async function permanentlyDisableCreatorMonetizationAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertCreatorMonetizationStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const profileId = String(formData.get("profile_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do khóa vĩnh viễn." };

  const before = await loadProfileBefore(profileId);
  const updated = await updateCreatorMonetizationProfile(profileId, {
    status: "permanently_disabled",
    monetization_enabled: false,
    payout_enabled: false,
    suspended_reason: reason
  });

  if (updated.data && auth.approverId) {
    await createAdminAuditLog({
      actorId: auth.approverId,
      action: "creator_monetization_permanent_disable",
      targetType: "creator_monetization",
      targetId: profileId,
      note: reason,
      before: before ?? undefined,
      after: updated.data as unknown as Record<string, unknown>,
      metadata: { target_user_id: updated.data.user_id }
    });
    revalidatePath(REVALIDATE);
  }
  return { ok: Boolean(updated.data), error: updated.error };
}

export async function updateCreatorRevenueShareAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  let approverId: string | null = null;
  const adminAuth = await checkStaffPermission("admin.settings.update");
  if (adminAuth.ok) {
    approverId = adminAuth.userId;
  } else {
    const financeAuth = await checkStaffPermission("finance.dashboard.view");
    if (!financeAuth.ok) return { ok: false, error: adminAuth.error };
    approverId = financeAuth.userId;
  }

  const profileId = String(formData.get("profile_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const enabled = formData.get("use_custom") === "true";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do thay đổi." };

  const percents = parsePercentsFromForm(formData);
  const validationError = validateRevenueSharePercents(percents, enabled);
  if (validationError) return { ok: false, error: validationError };

  const before = await loadProfileBefore(profileId);
  const customRevenueShare = enabled ? percentsToCustomJsonb(percents) : null;

  const updated = await updateCreatorMonetizationProfile(profileId, {
    custom_revenue_share: customRevenueShare
  });

  if (updated.data) {
    const supabase = await createClient();
    await supabase.from("creator_revenue_share_history").insert({
      user_id: userId || updated.data.user_id,
      monetization_profile_id: profileId,
      enabled,
      paid_chapter_percent: enabled ? percents.paidChapter : null,
      tip_percent: enabled ? percents.tip : null,
      fan_club_percent: enabled ? percents.fanClub : null,
      vip_pool_percent: enabled ? percents.vipPool : null,
      bonus_pool_percent: enabled ? percents.bonusPool : null,
      reason,
      created_by: approverId
    });

    await createAdminAuditLog({
      actorId: approverId,
      action: "creator_revenue_share_update",
      targetType: "creator_monetization",
      targetId: profileId,
      note: reason,
      before: before ?? undefined,
      after: {
        custom_revenue_share: customRevenueShare,
        enabled
      },
      metadata: { target_user_id: userId || updated.data.user_id, percents }
    });
    revalidatePath(REVALIDATE);
  }
  return { ok: Boolean(updated.data), error: updated.error };
}

export async function toggleCreatorPayoutAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await checkStaffPermission("finance.payout.view");
  if (!auth.ok) {
    const admin = await assertCreatorMonetizationStaff();
    if (!admin.ok) return { ok: false, error: auth.error };
  }
  const actorId =
    auth.ok ? auth.userId : (await assertCreatorMonetizationStaff()).approverId;
  if (!actorId) return { ok: false, error: "Không có quyền." };

  const profileId = String(formData.get("profile_id") ?? "");
  const enabled = formData.get("payout_enabled") === "true";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do." };

  const before = await loadProfileBefore(profileId);
  const updated = await updateCreatorMonetizationProfile(profileId, {
    payout_enabled: enabled
  });

  if (updated.data) {
    await createAdminAuditLog({
      actorId,
      action: enabled ? "creator_payout_enable" : "creator_payout_disable",
      targetType: "creator_monetization",
      targetId: profileId,
      note: reason,
      before: before ?? undefined,
      after: { payout_enabled: enabled },
      metadata: { target_user_id: updated.data.user_id }
    });
    revalidatePath(REVALIDATE);
  }
  return { ok: Boolean(updated.data), error: updated.error };
}

export async function updateCreatorStudioStatusAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertCreatorMonetizationStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const creatorProfileId = String(formData.get("creator_profile_id") ?? "");
  const status = String(formData.get("status") ?? "active");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do." };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("id", creatorProfileId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("creator_profiles")
    .update({ status })
    .eq("id", creatorProfileId)
    .select("*")
    .single();

  if (data && auth.approverId) {
    await createAdminAuditLog({
      actorId: auth.approverId,
      action: status === "active" ? "creator_studio_unlock" : "creator_studio_suspend",
      targetType: "creator_profile",
      targetId: creatorProfileId,
      note: reason,
      before: (before as Record<string, unknown>) ?? undefined,
      after: data as Record<string, unknown>,
      metadata: { target_user_id: data.user_id }
    });
    revalidatePath(REVALIDATE);
  }
  return { ok: Boolean(data), error: error?.message ?? null };
}

export async function updateCreatorAdminOverridesAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertCreatorMonetizationStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const profileId = String(formData.get("profile_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do." };

  const overrides = {
    payout_min_amount: formData.get("payout_min_amount")
      ? Number(formData.get("payout_min_amount"))
      : null,
    internal_note: String(formData.get("internal_note") ?? "").trim() || null,
    strategic_partner: formData.get("strategic_partner") === "true",
    bonus_pool_eligible: formData.get("bonus_pool_eligible") === "true",
    featured_author_eligible: formData.get("featured_author_eligible") === "true"
  };

  const before = await loadProfileBefore(profileId);
  const updated = await updateCreatorMonetizationProfile(profileId, {
    admin_overrides: overrides
  });

  if (updated.data && auth.approverId) {
    await createAdminAuditLog({
      actorId: auth.approverId,
      action: "creator_override_update",
      targetType: "creator_monetization",
      targetId: profileId,
      note: reason,
      before: before ?? undefined,
      after: { admin_overrides: overrides },
      metadata: { target_user_id: updated.data.user_id }
    });
    revalidatePath(REVALIDATE);
  }
  return { ok: Boolean(updated.data), error: updated.error };
}
