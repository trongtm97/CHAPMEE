"use server";

import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { upsertVipPlan } from "@/lib/supabase/vip";

function parseBool(value: FormDataEntryValue | null) {
  return String(value ?? "") === "true";
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveFormData(
  first: FormData | { ok: boolean; error: string | null },
  second?: FormData
) {
  return first instanceof FormData ? first : (second as FormData);
}

export async function saveVipPlanAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const benefits = {
    no_ads: parseBool(formData.get("benefit_no_ads")),
    monthly_coin_bonus: parseNumber(formData.get("benefit_monthly_coin_bonus"), 0),
    early_access_discount_percent: parseNumber(
      formData.get("benefit_early_access_discount_percent"),
      0
    ),
    paid_chapter_discount_percent: parseNumber(
      formData.get("benefit_paid_chapter_discount_percent"),
      0
    ),
    vip_badge: parseBool(formData.get("benefit_vip_badge")),
    exclusive_theme: parseBool(formData.get("benefit_exclusive_theme"))
  };

  const saved = await upsertVipPlan({
    id: String(formData.get("id") ?? "").trim() || undefined,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    priceVnd: parseNumber(formData.get("price_vnd"), 0),
    durationDays: parseNumber(formData.get("duration_days"), 30),
    coinBonusAmount: parseNumber(formData.get("coin_bonus_amount"), 0),
    benefits,
    isActive: parseBool(formData.get("is_active")),
    sortOrder: parseNumber(formData.get("sort_order"), 0)
  });

  if (!saved.data) return { ok: false, error: saved.error ?? "Không thể lưu VIP plan." };
  return { ok: true, error: null };
}
