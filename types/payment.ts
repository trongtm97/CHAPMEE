import type { TopupPackagePaymentSnapshot } from "@/types/topup-package";

export type PaymentProviderKey =
  | "sepay"
  | "apple_iap"
  | "manual"
  | "mock_test"
  | "vnpay"
  | "momo"
  | "zalopay"
  | "vietqr"
  | "app_store_iap"
  | "google_play_billing";

export type PaymentChannel =
  | "web_sepay"
  | "google_play_billing"
  | "apple_iap"
  | "manual_admin";

export type PaymentMode =
  | "web_payment"
  | "store_billing"
  | "consumption_only"
  | "external_link_eligible";

export type PlatformPaymentProvider =
  | "sepay"
  | "google_play"
  | "google_play_billing"
  | "apple_iap"
  | "manual"
  | "none";

export type CheckoutSessionStatus =
  | "created"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "manual_review";

export type CheckoutPlatform = "web" | "android" | "ios" | "admin";

export type RevenueBasis = "gross" | "net";

export type CoinPack = {
  id: string;
  name: string;
  base_coin_amount: number;
  bonus_coin_amount: number;
  total_coin_amount: number;
  bonus_percent: number;
  /** VND amount (same as price_vnd). */
  amount_vnd: number;
  price_vnd: number;
  currency: string;
  label: string | null;
  description: string | null;
  is_active: boolean;
  is_recommended: boolean;
  sort_order: number;
  badge_text: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentProviderSetting = {
  id: string;
  provider_key: PaymentProviderKey;
  enabled: boolean;
  test_mode: boolean;
  public_config: Record<string, unknown> | null;
  private_config_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckoutSession = {
  id: string;
  checkout_code: string | null;
  user_id: string;
  coin_pack_id: string;
  payment_channel: PaymentChannel;
  provider: PaymentProviderKey;
  provider_product_id: string | null;
  provider_reference: string | null;
  status: CheckoutSessionStatus;
  amount_vnd: number;
  gross_amount_vnd: number;
  provider_fee_vnd: number;
  store_fee_vnd: number;
  net_amount_vnd: number;
  currency: string;
  base_coin_amount: number;
  bonus_coin_amount: number;
  total_coin_amount: number;
  payment_reference: string | null;
  platform: CheckoutPlatform;
  admin_note?: string | null;
  transfer_content: string | null;
  qr_url: string | null;
  provider_payload: Record<string, unknown> | null;
  package_snapshot_json: TopupPackagePaymentSnapshot | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CoinPackChannelOverride = {
  id: string;
  coin_pack_id: string;
  payment_channel: PaymentChannel;
  provider_product_id: string | null;
  price_vnd: number | null;
  base_coin_amount: number | null;
  bonus_coin_amount: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PaymentProvider = "sepay" | "google_play" | "apple_iap" | "manual";

export type PaymentProviderProduct = {
  id: string;
  provider: PaymentProvider;
  payment_channel: PaymentChannel;
  product_id: string;
  coin_pack_id: string;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type PaymentWebhookEventStatus =
  | "received"
  | "processed"
  | "ignored"
  | "failed"
  | "manual_review"
  | "ignored_duplicate";

export type PaymentWebhookEvent = {
  id: string;
  provider: string;
  event_id: string | null;
  checkout_session_id: string | null;
  status: PaymentWebhookEventStatus;
  raw_payload: Record<string, unknown>;
  signature_valid: boolean | null;
  amount_vnd: number | null;
  transfer_content: string | null;
  provider_reference: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

export type PaymentProviderCreateResult = {
  ok: boolean;
  redirectUrl?: string;
  instruction?: string;
  providerReference?: string;
  rawPayload?: Record<string, unknown>;
  error?: string;
};
