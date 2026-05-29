import type { PlatformKey, PlatformStrategy } from "@/types/platform";

export const DEFAULT_PLATFORM_STRATEGIES: Record<PlatformKey, PlatformStrategy> = {
  web_desktop: {
    platform_key: "web_desktop",
    layout_mode: "desktop_website",
    payment_mode: "web_payment",
    payment_provider: "sepay",
    show_bottom_nav: false,
    show_desktop_header: true,
    allow_external_web_payment: true,
    allow_in_app_purchase: false,
    notes: "Desktop web cho SEO/reading, thanh toan web bang SePay."
  },
  web_mobile_pwa: {
    platform_key: "web_mobile_pwa",
    layout_mode: "mobile_app_like",
    payment_mode: "web_payment",
    payment_provider: "sepay",
    show_bottom_nav: true,
    show_desktop_header: false,
    allow_external_web_payment: true,
    allow_in_app_purchase: false,
    notes: "Mobile web/PWA uu tien trai nghiem app-like, nap coin qua SePay."
  },
  android_app_future: {
    platform_key: "android_app_future",
    layout_mode: "native_or_pwa_app_like",
    payment_mode: "consumption_only",
    payment_provider: "none",
    show_bottom_nav: true,
    show_desktop_header: false,
    allow_external_web_payment: false,
    allow_in_app_purchase: true,
    notes: "Android app future uu tien Google Play Billing; co the dung consumption-only khi can."
  },
  ios_app_future: {
    platform_key: "ios_app_future",
    layout_mode: "native_or_pwa_app_like",
    payment_mode: "consumption_only",
    payment_provider: "none",
    show_bottom_nav: true,
    show_desktop_header: false,
    allow_external_web_payment: false,
    allow_in_app_purchase: true,
    notes: "iOS app future uu tien Apple IAP; co the dung consumption-only khi can."
  }
};

export function getPlatformStrategy(platformKey: PlatformKey): PlatformStrategy {
  return DEFAULT_PLATFORM_STRATEGIES[platformKey];
}
