import type { PaymentProviderAdapter } from "@/lib/payments/types";

export const zalopayProvider: PaymentProviderAdapter = {
  key: "zalopay",
  async createCheckout() {
    return {
      ok: false,
      error: "ZaloPay provider chưa cấu hình credential."
    };
  },
  async handleCallback() {
    return { ok: false, reason: "ZaloPay callback chưa triển khai." };
  }
};
