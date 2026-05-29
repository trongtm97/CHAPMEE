import { mockPaymentProvider } from "@/lib/payments/providers/mock";
import { vnpayProvider } from "@/lib/payments/providers/vnpay";
import { momoProvider } from "@/lib/payments/providers/momo";
import { zalopayProvider } from "@/lib/payments/providers/zalopay";
import { vietqrProvider } from "@/lib/payments/providers/vietqr";
import { appStoreIapProvider } from "@/lib/payments/providers/app-store-iap";
import { googlePlayBillingProvider } from "@/lib/payments/providers/google-play-billing";
import { sepayProvider } from "@/lib/payments/providers/sepay";
import { manualProvider } from "@/lib/payments/providers/manual";
import type { PaymentProviderAdapter } from "@/lib/payments/types";
import type { PaymentProviderKey } from "@/types/payment";

const registry: Record<PaymentProviderKey, PaymentProviderAdapter> = {
  sepay: sepayProvider,
  apple_iap: appStoreIapProvider,
  manual: manualProvider,
  mock_test: mockPaymentProvider,
  vnpay: vnpayProvider,
  momo: momoProvider,
  zalopay: zalopayProvider,
  vietqr: vietqrProvider,
  app_store_iap: appStoreIapProvider,
  google_play_billing: googlePlayBillingProvider
};

export function getPaymentProviderAdapter(provider: PaymentProviderKey) {
  return registry[provider];
}
