import type { PaymentProviderAdapter } from "@/lib/payments/types";
import { generateSepayQrUrl, getSePayRuntimeConfig } from "@/lib/payments/sepay-config";

export const sepayProvider: PaymentProviderAdapter = {
  key: "sepay",
  async createCheckout(checkout) {
    const { config, ready, missing } = await getSePayRuntimeConfig();
    if (!ready) {
      return {
        ok: false,
        error: `SePay provider chưa cấu hình env: ${missing.join(", ")}`
      };
    }

    const qrUrl = generateSepayQrUrl({
      accountNumber: config.bankAccountNumber,
      bankCode: config.bankCode,
      amountVnd: checkout.gross_amount_vnd,
      description: checkout.transfer_content ?? "",
      qrBaseUrl: config.qrBaseUrl
    });

    return {
      ok: true,
      instruction:
        "Vui long chuyen dung so tien va dung noi dung. He thong se tu dong xac nhan sau khi nhan giao dich.",
      providerReference: checkout.checkout_code ?? `SEPAY-${checkout.id}`,
      rawPayload: {
        qrUrl,
        bankCode: config.bankCode,
        bankAccountNumber: config.bankAccountNumber,
        bankAccountName: config.bankAccountName,
        transferContent: checkout.transfer_content,
        amountVnd: checkout.gross_amount_vnd
      }
    };
  },
  async handleCallback(payload) {
    const sessionId =
      typeof payload.sessionId === "string" ? payload.sessionId : "";
    const providerReference =
      typeof payload.providerReference === "string"
        ? payload.providerReference
        : null;
    if (!sessionId) {
      return { ok: false, reason: "Missing sessionId in SePay callback payload." };
    }
    return { ok: true, sessionId, providerReference: providerReference ?? undefined };
  }
};
