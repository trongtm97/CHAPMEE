export type SePayConfig = {
  apiKey: string;
  webhookSecret: string;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
  qrBaseUrl: string | null;
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

export function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `${"*".repeat(Math.max(accountNumber.length - 4, 0))}${accountNumber.slice(-4)}`;
}
