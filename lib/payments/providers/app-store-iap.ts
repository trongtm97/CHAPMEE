import type { PaymentProviderAdapter } from "@/lib/payments/types";

export const appStoreIapProvider: PaymentProviderAdapter = {
  key: "app_store_iap",
  async createCheckout() {
    return {
      ok: false,
      error: "App Store IAP provider chưa cấu hình."
    };
  },
  async handleCallback() {
    return { ok: false, reason: "App Store IAP callback chưa triển khai." };
  }
};
