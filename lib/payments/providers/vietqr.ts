import type { PaymentProviderAdapter } from "@/lib/payments/types";

export const vietqrProvider: PaymentProviderAdapter = {
  key: "vietqr",
  async createCheckout() {
    return {
      ok: false,
      error: "VietQR provider chưa cấu hình credential."
    };
  },
  async handleCallback() {
    return { ok: false, reason: "VietQR callback chưa triển khai." };
  }
};
