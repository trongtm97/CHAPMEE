import type { PaymentProviderAdapter } from "@/lib/payments/types";

export const manualProvider: PaymentProviderAdapter = {
  key: "manual",
  async createCheckout(checkout) {
    return {
      ok: true,
      instruction: `Manual admin review required for checkout ${checkout.id}.`,
      providerReference: `MANUAL-${checkout.id}`
    };
  },
  async handleCallback(payload) {
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : "";
    if (!sessionId) {
      return { ok: false, reason: "Missing sessionId in manual callback payload." };
    }

    return {
      ok: true,
      sessionId,
      providerReference:
        typeof payload.providerReference === "string"
          ? payload.providerReference
          : `MANUAL-${sessionId}`
    };
  }
};
