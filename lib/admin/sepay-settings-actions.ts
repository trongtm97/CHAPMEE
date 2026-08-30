"use server";

import { revalidatePath } from "next/cache";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { encryptServerSecret, decryptServerSecret } from "@/lib/security/encryption";
import {
  getPaymentProviderSettings,
  upsertPaymentProviderSetting
} from "@/lib/data/payment-provider-settings";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function num(formData: FormData, key: string, fallback: number) {
  const parsed = Number(formData.get(key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePrivate(reference: string | null | undefined) {
  const decrypted = decryptServerSecret(reference);
  if (!decrypted) return {};
  try {
    return JSON.parse(decrypted) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function saveSepaySettingsAction(formData: FormData) {
  const auth = await checkStaffAnyPermission([
    "finance.settings.update",
    "admin.settings.update"
  ]);
  if (!auth.ok) return { ok: false, error: auth.error };

  const current = (await getPaymentProviderSettings()).data.find(
    (item) => item.provider_key === "sepay"
  );
  const privateConfig = parsePrivate(current?.private_config_reference);
  const apiKey = text(formData, "sepay_api_key");
  const webhookSecret = text(formData, "sepay_webhook_secret");
  if (apiKey) privateConfig.apiKey = apiKey;
  if (webhookSecret) privateConfig.webhookSecret = webhookSecret;

  let privateConfigReference = current?.private_config_reference ?? null;
  if (apiKey || webhookSecret) {
    privateConfigReference = encryptServerSecret(JSON.stringify(privateConfig));
  }

  const publicConfig = {
    sepay_display_name: text(formData, "sepay_display_name") || "Chuyen khoan ngan hang",
    bank_code: text(formData, "bank_code"),
    bank_account_number: text(formData, "bank_account_number"),
    bank_account_name: text(formData, "bank_account_name"),
    qr_provider: "sepay_vietqr",
    qr_base_url: text(formData, "qr_base_url") || "https://qr.sepay.vn/img",
    qr_template_enabled: bool(formData, "qr_template_enabled"),
    manual_bank_transfer_enabled: bool(formData, "manual_bank_transfer_enabled"),
    sepay_auth_method: text(formData, "sepay_auth_method") || "hmac_sha256",
    allowed_transfer_type: text(formData, "allowed_transfer_type") || "in",
    allowed_account_numbers: text(formData, "allowed_account_numbers")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    topup_order_expire_minutes: num(formData, "topup_order_expire_minutes", 30),
    payment_code_mode: "numeric_only",
    payment_code_length: 12,
    payment_code_description_template: "{payment_code}",
    require_exact_amount: bool(formData, "require_exact_amount"),
    require_exact_code: true,
    allow_amount_tolerance_vnd: 0,
    auto_match_window_hours: 24,
    enable_sepay_on_web: bool(formData, "enable_sepay_on_web"),
    enable_sepay_on_pwa: bool(formData, "enable_sepay_on_pwa"),
    enable_sepay_on_ios_native: false,
    enable_sepay_on_android_native: false,
    topup_payment_instruction: text(formData, "topup_payment_instruction"),
    topup_support_note: text(formData, "topup_support_note")
  };

  const result = await upsertPaymentProviderSetting({
    providerKey: "sepay",
    enabled: bool(formData, "enable_sepay_topup"),
    testMode: text(formData, "sepay_environment") !== "live",
    publicConfig,
    privateConfigReference
  });

  if (result.error) return { ok: false, error: result.error };

  await logAdminAction({
    actorId: auth.userId,
    action: "sepay_settings.update",
    targetType: "payment_provider_settings",
    targetId: "sepay",
    metadata: {
      changed_public_config: publicConfig,
      secret_updated: Boolean(apiKey || webhookSecret)
    }
  });

  revalidatePath("/admin/monetization-settings");
  return { ok: true, error: null };
}
