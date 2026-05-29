import type { PaymentChannel, PaymentProvider } from "@/types/payment";

export const PAYMENT_CHANNEL_PROVIDER: Record<PaymentChannel, PaymentProvider> = {
  web_sepay: "sepay",
  google_play_billing: "google_play",
  apple_iap: "apple_iap",
  manual_admin: "manual"
};

export function resolveProviderFromChannel(channel: PaymentChannel): PaymentProvider {
  return PAYMENT_CHANNEL_PROVIDER[channel];
}
