import type { PaymentProviderAdapter } from "@/lib/payments/types";
import { getGooglePlayConfig, handleGooglePlayNotification } from "@/lib/payments/providers/google-play";

export const googlePlayBillingProvider: PaymentProviderAdapter = {
  key: "google_play_billing",
  async createCheckout() {
    const config = await getGooglePlayConfig();
    if (config.notConfigured) {
      return {
        ok: false,
        error: "GOOGLE_PLAY_NOT_CONFIGURED: Google Play Billing provider chưa cấu hình."
      };
    }
    return {
      ok: false,
      error: "Google Play Billing checkout sẽ được tạo từ app native bằng purchase token."
    };
  },
  async handleCallback(payload) {
    const handled = await handleGooglePlayNotification(payload);
    if (!handled.ok) {
      const reason =
        typeof handled.error === "string"
          ? handled.error
          : handled.error?.message ?? "Google Play notification failed.";
      return { ok: false, reason };
    }
    return {
      ok: true,
      sessionId: "sessionId" in handled ? handled.sessionId : undefined,
      providerReference: "providerReference" in handled ? handled.providerReference : undefined
    };
  }
};
