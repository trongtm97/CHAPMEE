import type { PaymentProviderAdapter } from "@/lib/payments/types";

export const mockPaymentProvider: PaymentProviderAdapter = {
  key: "mock_test",
  async createCheckout(checkout, context) {
    if (!context.testMode) {
      return { ok: false, error: "Mock provider chỉ dùng trong test mode." };
    }

    return {
      ok: true,
      instruction: "Mock checkout created. Use simulate paid trong test mode.",
      providerReference: `MOCK-${checkout.id}`
    };
  },
  async handleCallback(payload, context) {
    if (!context.testMode) {
      return { ok: false, reason: "Mock callback disabled outside test mode." };
    }

    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : "";
    if (!sessionId) {
      return { ok: false, reason: "Missing sessionId in callback payload." };
    }

    return {
      ok: true,
      sessionId,
      providerReference:
        typeof payload.providerReference === "string"
          ? payload.providerReference
          : `MOCK-${sessionId}`
    };
  }
};
