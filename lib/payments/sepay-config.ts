import { createAdminClient } from "@/lib/data/admin";
import { decryptServerSecret, maskSecret } from "@/lib/security/encryption";

export type SePayConfig = {
  apiKey: string;
  webhookSecret: string;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
  qrBaseUrl: string | null;
  authMethod?: "hmac_sha256" | "api_key" | "none";
  displayName?: string;
  environment?: "test" | "live";
  orderExpireMinutes?: number;
  allowedTransferType?: string;
  allowedAccountNumbers?: string[];
  requireExactAmount?: boolean;
  requireExactCode?: boolean;
};

export function getSePayConfig() {
  const config: SePayConfig = {
    apiKey: process.env.SEPAY_API_KEY ?? "",
    webhookSecret: process.env.SEPAY_WEBHOOK_SECRET ?? "",
    bankCode: process.env.SEPAY_BANK_CODE ?? "",
    bankAccountNumber: process.env.SEPAY_BANK_ACCOUNT_NUMBER ?? "",
    bankAccountName: process.env.SEPAY_BANK_ACCOUNT_NAME ?? "",
    qrBaseUrl: process.env.SEPAY_QR_BASE_URL ?? null
  };

  const missing: string[] = [];
  if (!config.apiKey) missing.push("SEPAY_API_KEY");
  if (!config.webhookSecret) missing.push("SEPAY_WEBHOOK_SECRET");
  if (!config.bankCode) missing.push("SEPAY_BANK_CODE");
  if (!config.bankAccountNumber) missing.push("SEPAY_BANK_ACCOUNT_NUMBER");
  if (!config.bankAccountName) missing.push("SEPAY_BANK_ACCOUNT_NAME");

  return {
    config,
    ready: missing.length === 0,
    missing
  };
}

function readString(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readBoolean(config: Record<string, unknown>, key: string, fallback: boolean) {
  const value = config[key];
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(config: Record<string, unknown>, key: string, fallback: number) {
  const value = Number(config[key]);
  return Number.isFinite(value) ? value : fallback;
}

function readList(config: Record<string, unknown>, key: string, fallback: string[]) {
  const value = config[key];
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return fallback;
}

function parsePrivateConfig(encrypted: string | null) {
  const decrypted = decryptServerSecret(encrypted);
  if (!decrypted) return {};
  try {
    return JSON.parse(decrypted) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function getSePayRuntimeConfig() {
  const env = getSePayConfig();
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("payment_provider_settings")
      .select("enabled, test_mode, public_config, private_config_reference")
      .eq("provider_key", "sepay")
      .maybeSingle();

    const publicConfig = (data?.public_config ?? {}) as Record<string, unknown>;
    const privateConfig = parsePrivateConfig(data?.private_config_reference ?? null);
    const accountNumbers = readList(publicConfig, "allowed_account_numbers", []);
    const bankAccountNumber = readString(
      publicConfig,
      "bank_account_number",
      env.config.bankAccountNumber
    );

    const config: SePayConfig = {
      apiKey: privateConfig.apiKey ?? env.config.apiKey,
      webhookSecret: privateConfig.webhookSecret ?? env.config.webhookSecret,
      bankCode: readString(publicConfig, "bank_code", env.config.bankCode),
      bankAccountNumber,
      bankAccountName: readString(
        publicConfig,
        "bank_account_name",
        env.config.bankAccountName
      ),
      qrBaseUrl: readString(
        publicConfig,
        "qr_base_url",
        env.config.qrBaseUrl ?? "https://qr.sepay.vn/img"
      ),
      authMethod: readString(publicConfig, "sepay_auth_method", "hmac_sha256") as
        | "hmac_sha256"
        | "api_key"
        | "none",
      displayName: readString(publicConfig, "sepay_display_name", "Chuyen khoan ngan hang"),
      environment: (data?.test_mode ? "test" : "live") as "test" | "live",
      orderExpireMinutes: readNumber(publicConfig, "topup_order_expire_minutes", 30),
      allowedTransferType: readString(publicConfig, "allowed_transfer_type", "in"),
      allowedAccountNumbers: accountNumbers.length > 0 ? accountNumbers : [bankAccountNumber].filter(Boolean),
      requireExactAmount: readBoolean(publicConfig, "require_exact_amount", true),
      requireExactCode: readBoolean(publicConfig, "require_exact_code", true)
    };

    const missing: string[] = [];
    if (!config.bankCode) missing.push("bank_code");
    if (!config.bankAccountNumber) missing.push("bank_account_number");
    if (!config.bankAccountName) missing.push("bank_account_name");
    if (config.authMethod === "hmac_sha256" && !config.webhookSecret) {
      missing.push("sepay_webhook_secret");
    }
    if (config.authMethod === "api_key" && !config.apiKey) {
      missing.push("sepay_api_key");
    }

    return {
      config,
      enabled: Boolean(data?.enabled),
      ready: Boolean(data?.enabled) && missing.length === 0,
      missing,
      masked: {
        apiKey: maskSecret(config.apiKey),
        webhookSecret: maskSecret(config.webhookSecret)
      }
    };
  } catch {
    return { ...env, enabled: env.ready, masked: { apiKey: maskSecret(env.config.apiKey), webhookSecret: maskSecret(env.config.webhookSecret) } };
  }
}

export function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `${"*".repeat(Math.max(accountNumber.length - 4, 0))}${accountNumber.slice(-4)}`;
}

export function generateSepayQrUrl(input: {
  accountNumber: string;
  bankCode: string;
  amountVnd: number;
  description: string;
  qrBaseUrl?: string | null;
}) {
  const url = new URL(input.qrBaseUrl || "https://qr.sepay.vn/img");
  url.searchParams.set("acc", input.accountNumber);
  url.searchParams.set("bank", input.bankCode);
  url.searchParams.set("amount", String(Math.round(input.amountVnd)));
  url.searchParams.set("des", input.description);
  return url.toString();
}
