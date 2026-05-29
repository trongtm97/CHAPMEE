import type { PaymentChannel, PaymentMode, PaymentProvider } from "@/types/payment";

export const PAYMENT_CHANNELS: readonly PaymentChannel[] = [
  "web_sepay",
  "google_play_billing",
  "apple_iap",
  "manual_admin"
] as const;

export const PAYMENT_MODES: readonly PaymentMode[] = [
  "web_payment",
  "store_billing",
  "consumption_only",
  "external_link_eligible"
] as const;

export const DEFAULT_CHANNEL_FEE_PERCENT: Record<PaymentChannel, number> = {
  web_sepay: 2,
  google_play_billing: 15,
  apple_iap: 15,
  manual_admin: 0
};

export const CHANNEL_PROVIDER: Record<PaymentChannel, PaymentProvider> = {
  web_sepay: "sepay",
  google_play_billing: "google_play",
  apple_iap: "apple_iap",
  manual_admin: "manual"
};
