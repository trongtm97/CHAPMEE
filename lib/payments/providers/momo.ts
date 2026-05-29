import type { PaymentProviderAdapter } from "@/lib/payments/types";

export const momoProvider: PaymentProviderAdapter = {
  key: "momo",
  async createCheckout() {
    return {
      ok: false,
      error: "MoMo provider chưa cấu hình credential."
    };
  },
  async handleCallback() {
    return { ok: false, reason: "MoMo callback chưa triển khai." };
  }
};
