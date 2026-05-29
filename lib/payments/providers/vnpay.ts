import type { PaymentProviderAdapter } from "@/lib/payments/types";

export const vnpayProvider: PaymentProviderAdapter = {
  key: "vnpay",
  async createCheckout() {
    return {
      ok: false,
      error: "VNPay provider chưa cấu hình credential."
    };
  },
  async handleCallback() {
    return { ok: false, reason: "VNPay callback chưa triển khai." };
  }
};
