import type { CheckoutSession, PaymentProviderCreateResult, PaymentProviderKey } from "@/types/payment";

export type PaymentProviderContext = {
  testMode: boolean;
};

export interface PaymentProviderAdapter {
  key: PaymentProviderKey;
  createCheckout(
    checkout: CheckoutSession,
    context: PaymentProviderContext
  ): Promise<PaymentProviderCreateResult>;
  handleCallback(
    payload: Record<string, unknown>,
    context: PaymentProviderContext
  ): Promise<{
    ok: boolean;
    sessionId?: string;
    providerReference?: string;
    reason?: string;
  }>;
}
