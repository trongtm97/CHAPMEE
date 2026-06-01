import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  AdRevenueEstimateSettings,
  AdRevenueEstimateSettingsInput
} from "@/types/ad-revenue";

export const AD_REVENUE_SETTINGS_ID = "11111111-1111-1111-1111-111111111111";

const DEFAULT_SETTINGS: AdRevenueEstimateSettings = {
  id: AD_REVENUE_SETTINGS_ID,
  default_rpm_vnd: 5000,
  creator_pool_percent: 30,
  reserve_percent: 15,
  reserve_hold_days: 60,
  min_payout_vnd: 200000,
  is_creator_ads_revenue_enabled: false,
  is_estimate_visible_to_creators: false,
  notes: null,
  updated_at: new Date().toISOString()
};

function mapSettings(row: Record<string, unknown>): AdRevenueEstimateSettings {
  return {
    id: String(row.id),
    default_rpm_vnd: Number(row.default_rpm_vnd ?? 5000),
    creator_pool_percent: Number(row.creator_pool_percent ?? 30),
    reserve_percent: Number(row.reserve_percent ?? 15),
    reserve_hold_days: Number(row.reserve_hold_days ?? 60),
    min_payout_vnd: Number(row.min_payout_vnd ?? 200000),
    is_creator_ads_revenue_enabled: Boolean(row.is_creator_ads_revenue_enabled),
    is_estimate_visible_to_creators: Boolean(row.is_estimate_visible_to_creators),
    notes: (row.notes as string | null) ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };
}

export async function getAdRevenueEstimateSettings(options?: {
  useAdmin?: boolean;
}): Promise<AdRevenueEstimateSettings> {
  try {
    const supabase = options?.useAdmin ? createAdminClient() : await createClient();
    const { data, error } = await supabase
      .from("ad_revenue_estimate_settings")
      .select("*")
      .eq("id", AD_REVENUE_SETTINGS_ID)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_SETTINGS;
    }
    return mapSettings(data as Record<string, unknown>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateAdRevenueEstimateSettings(
  input: AdRevenueEstimateSettingsInput
): Promise<{ settings: AdRevenueEstimateSettings | null; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (input.default_rpm_vnd !== undefined) patch.default_rpm_vnd = input.default_rpm_vnd;
    if (input.creator_pool_percent !== undefined) patch.creator_pool_percent = input.creator_pool_percent;
    if (input.reserve_percent !== undefined) patch.reserve_percent = input.reserve_percent;
    if (input.reserve_hold_days !== undefined) patch.reserve_hold_days = input.reserve_hold_days;
    if (input.min_payout_vnd !== undefined) patch.min_payout_vnd = input.min_payout_vnd;
    if (input.is_creator_ads_revenue_enabled !== undefined) {
      patch.is_creator_ads_revenue_enabled = input.is_creator_ads_revenue_enabled;
    }
    if (input.is_estimate_visible_to_creators !== undefined) {
      patch.is_estimate_visible_to_creators = input.is_estimate_visible_to_creators;
    }
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("ad_revenue_estimate_settings")
      .update(patch)
      .eq("id", AD_REVENUE_SETTINGS_ID)
      .select("*")
      .single();

    if (error) {
      return { settings: null, error: error.message };
    }
    return { settings: mapSettings(data as Record<string, unknown>), error: null };
  } catch {
    return { settings: null, error: "Không cập nhật được cấu hình ước tính quảng cáo." };
  }
}

export function computeCreatorPoolVnd(grossVnd: number, poolPercent: number): number {
  return grossVnd * (poolPercent / 100);
}

export function computeReserveHoldVnd(poolVnd: number, reservePercent: number): number {
  return poolVnd * (reservePercent / 100);
}

export function computeEstimatedPayableVnd(grossVnd: number, poolPercent: number, reservePercent: number): number {
  const pool = computeCreatorPoolVnd(grossVnd, poolPercent);
  return pool * (1 - reservePercent / 100);
}
