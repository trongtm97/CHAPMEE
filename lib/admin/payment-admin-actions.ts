"use server";

import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import {
  getSettingDefinition,
  refreshMonetizationConfig
} from "@/lib/monetization/config";
import { upsertMonetizationSettings } from "@/lib/supabase/monetization-settings";
import { upsertCoinPack } from "@/lib/supabase/coin-packs";
import { upsertPaymentProviderSetting } from "@/lib/supabase/payment-provider-settings";
import { upsertPaymentProviderProduct } from "@/lib/supabase/payment-provider-products";
import type { PaymentChannel, PaymentProvider, PaymentProviderKey } from "@/types/payment";

async function assertPaymentAdminStaff() {
  return checkStaffPermission("admin.settings.update");
}

async function auditPaymentAdminAction(
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  const ctx = await getCurrentAuthContext();
  if (!ctx) return;
  await logAdminAction({
    actorId: ctx.userId,
    action,
    targetType,
    targetId,
    metadata
  });
}

function resolveFormData(
  first: FormData | { ok: boolean; error: string | null },
  second?: FormData
) {
  return first instanceof FormData ? first : (second as FormData);
}

export async function saveCoinPackAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertPaymentAdminStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const packId = (formData.get("id") as string) || undefined;
  const result = await upsertCoinPack({
    id: packId,
    name: String(formData.get("name") ?? "").trim(),
    baseCoinAmount: Number(formData.get("base_coin_amount") ?? 0),
    bonusCoinAmount: Number(formData.get("bonus_coin_amount") ?? 0),
    priceVnd: Number(formData.get("price_vnd") ?? 0),
    currency: String(formData.get("currency") ?? "VND"),
    label: String(formData.get("label") ?? "").trim() || null,
    isActive: String(formData.get("is_active") ?? "false") === "true",
    sortOrder: Number(formData.get("sort_order") ?? 0),
    badgeText: String(formData.get("badge_text") ?? "").trim() || null
  });

  if (result.data) {
    await auditPaymentAdminAction(
      packId ? "update_coin_pack" : "create_coin_pack",
      "coin_pack",
      String(result.data.id ?? packId ?? "new")
    );
  }

  return { ok: Boolean(result.data), error: result.error, data: result.data };
}

export async function saveProviderSettingAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertPaymentAdminStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const providerKey = String(formData.get("provider_key") ?? "") as PaymentProviderKey;
  const result = await upsertPaymentProviderSetting({
    providerKey,
    enabled: String(formData.get("enabled") ?? "false") === "true",
    testMode: String(formData.get("test_mode") ?? "false") === "true",
    privateConfigReference:
      String(formData.get("private_config_reference") ?? "").trim() || null
  });

  if (result.data) {
    await auditPaymentAdminAction(
      "update_payment_provider_setting",
      "payment_provider_setting",
      providerKey
    );
  }

  return { ok: Boolean(result.data), error: result.error, data: result.data };
}

export async function saveProviderProductMappingAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertPaymentAdminStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const provider = String(formData.get("provider") ?? "") as PaymentProvider;
  const paymentChannel = String(formData.get("payment_channel") ?? "") as PaymentChannel;
  const productId = String(formData.get("product_id") ?? "").trim();
  const coinPackId = String(formData.get("coin_pack_id") ?? "").trim();

  if (!provider || !paymentChannel || !productId || !coinPackId) {
    return { ok: false, error: "Thiếu thông tin mapping (provider/channel/product/coin pack)." };
  }

  const metadataRaw = String(formData.get("metadata_json") ?? "").trim();
  let metadata: Record<string, unknown> | null = null;
  if (metadataRaw) {
    try {
      metadata = JSON.parse(metadataRaw) as Record<string, unknown>;
    } catch {
      return { ok: false, error: "Metadata JSON không hợp lệ." };
    }
  }

  const result = await upsertPaymentProviderProduct({
    id: String(formData.get("id") ?? "").trim() || undefined,
    provider,
    paymentChannel,
    productId,
    coinPackId,
    isActive: String(formData.get("is_active") ?? "false") === "true",
    metadata
  });

  if (result.data) {
    await auditPaymentAdminAction(
      "update_app_settings",
      "payment_provider_product",
      String(result.data.id ?? formData.get("id") ?? "new")
    );
  }

  return { ok: Boolean(result.data), error: result.error, data: result.data };
}

function parseNumericField(formData: FormData, key: string, fallback: number) {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export async function saveGooglePlaySettingsAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertPaymentAdminStaff();
  if (!auth.ok) return { ok: false, error: auth.error };

  const keys = [
    "payments.provider_google_play_billing_enabled",
    "payments.google_play.test_mode",
    "payments.google_play.default_store_fee_percent",
    "payments.google_play.standard_fee_percent",
    "payments.google_play.use_reduced_fee_estimate",
    "payments.google_play.package_name",
    "payments.google_play.credentials_configured"
  ] as const;

  const updates = keys
    .map((key) => {
      const definition = getSettingDefinition(key);
      if (!definition) return null;

      let value: boolean | number | string;
      switch (definition.inputType) {
        case "boolean":
          value = String(formData.get(key) ?? "false") === "true";
          break;
        case "number":
          value = parseNumericField(formData, key, Number(definition.defaultValue));
          break;
        default:
          value = String(formData.get(key) ?? "").trim();
          break;
      }

      return {
        key: definition.key,
        value,
        description: definition.description,
        isPublic: definition.isPublic
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const result = await upsertMonetizationSettings(updates, null);
  if (!result.success) {
    return { ok: false, error: result.error ?? "Không thể lưu Google Play settings." };
  }

  refreshMonetizationConfig();
  await auditPaymentAdminAction("update_app_settings", "google_play_settings", "google_play");
  return { ok: true, error: null };
}
