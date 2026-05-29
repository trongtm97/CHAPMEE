import type { PaymentMode, PlatformPaymentProvider } from "@/types/payment";

export type PlatformKey =
  | "web_desktop"
  | "web_mobile_pwa"
  | "android_app_future"
  | "ios_app_future";

export type PlatformLayoutMode =
  | "desktop_website"
  | "mobile_app_like"
  | "native_or_pwa_app_like";

export type PlatformStrategy = {
  platform_key: PlatformKey;
  layout_mode: PlatformLayoutMode;
  payment_mode: PaymentMode;
  payment_provider: PlatformPaymentProvider;
  show_bottom_nav: boolean;
  show_desktop_header: boolean;
  allow_external_web_payment: boolean;
  allow_in_app_purchase: boolean;
  notes: string;
};
