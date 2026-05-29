import { calculateChannelAmounts } from "@/lib/payments/payment-fees";
import { completeCheckoutPayment } from "@/lib/payments/complete-payment";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getCoinPackById } from "@/lib/supabase/coin-packs";
import {
  createCheckoutSessionRecord,
  findGooglePlayCheckoutByPurchaseKeys,
  getCheckoutSessionByProviderReference
} from "@/lib/supabase/checkout-sessions";
import { getPaymentProviderProductByProductId } from "@/lib/supabase/payment-provider-products";
import type { CoinPack } from "@/types/payment";

type GooglePlayErrorCode =
  | "GOOGLE_PLAY_NOT_CONFIGURED"
  | "GOOGLE_PLAY_VERIFICATION_NOT_IMPLEMENTED"
  | "GOOGLE_PLAY_VERIFICATION_FAILED"
  | "GOOGLE_PLAY_PRODUCT_NOT_MAPPED"
  | "GOOGLE_PLAY_CHECKOUT_CREATE_FAILED"
  | "GOOGLE_PLAY_INVALID_PAYLOAD";

type GooglePlayConfig = {
  enabled: boolean;
  testMode: boolean;
  credentialsConfigured: boolean;
  packageName: string;
  defaultStoreFeePercent: number;
  standardFeePercent: number;
  useReducedFeeEstimate: boolean;
  notConfigured: boolean;
};

type GooglePlaySafeError = {
  ok: false;
  code: GooglePlayErrorCode;
  message: string;
};

type GooglePlayVerifyResult =
  | GooglePlaySafeError
  | {
      ok: true;
      verificationState: "verified";
      providerReference: string;
      amountVnd: number | null;
      metadata: Record<string, unknown>;
    };

function asNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeError(code: GooglePlayErrorCode, message: string): GooglePlaySafeError {
  return { ok: false, code, message };
}

export async function getGooglePlayConfig(): Promise<GooglePlayConfig> {
  const { settings } = await getMonetizationConfig({ includePrivate: true });
  const enabled = Boolean(settings["payments.provider_google_play_billing_enabled"]);
  const credentialsConfigured = Boolean(settings["payments.google_play.credentials_configured"]);
  const packageName = String(settings["payments.google_play.package_name"] ?? "").trim();
  const notConfigured = !enabled || !credentialsConfigured || !packageName;

  return {
    enabled,
    credentialsConfigured,
    packageName,
    notConfigured,
    testMode: Boolean(settings["payments.google_play.test_mode"]),
    defaultStoreFeePercent: asNumber(settings["payments.google_play.default_store_fee_percent"], 15),
    standardFeePercent: asNumber(settings["payments.google_play.standard_fee_percent"], 30),
    useReducedFeeEstimate: Boolean(settings["payments.google_play.use_reduced_fee_estimate"])
  };
}

function buildProviderReference(input: {
  orderId?: string | null;
  purchaseToken: string;
  productId: string;
}) {
  if (input.orderId?.trim()) return `gpb:${input.orderId.trim()}`;
  return `gpb:${input.productId}:${input.purchaseToken}`;
}

export async function mapGoogleProductToCoinPack(productId: string): Promise<{
  ok: boolean;
  error?: GooglePlaySafeError;
  coinPack?: CoinPack;
}> {
  const mapping = await getPaymentProviderProductByProductId({
    provider: "google_play",
    paymentChannel: "google_play_billing",
    productId
  });

  if (!mapping.data) {
    return {
      ok: false,
      error: safeError("GOOGLE_PLAY_PRODUCT_NOT_MAPPED", mapping.error ?? "Google product chưa được map.")
    };
  }

  const pack = await getCoinPackById(mapping.data.coin_pack_id);
  if (!pack.data || !pack.data.is_active) {
    return {
      ok: false,
      error: safeError("GOOGLE_PLAY_PRODUCT_NOT_MAPPED", "Coin pack mapped không tồn tại hoặc đã tắt.")
    };
  }

  return { ok: true, coinPack: pack.data };
}

export async function verifyGooglePlayPurchaseToken(params: {
  purchaseToken: string;
  productId: string;
  orderId?: string | null;
  packageName?: string | null;
}): Promise<GooglePlayVerifyResult> {
  if (!params.purchaseToken?.trim() || !params.productId?.trim()) {
    return safeError("GOOGLE_PLAY_INVALID_PAYLOAD", "Thiếu purchaseToken hoặc productId.");
  }

  const config = await getGooglePlayConfig();
  if (config.notConfigured) {
    return safeError(
      "GOOGLE_PLAY_NOT_CONFIGURED",
      "Google Play Billing chưa cấu hình credentials/package_name."
    );
  }

  const packageName = params.packageName?.trim() || config.packageName;
  return safeError(
    "GOOGLE_PLAY_VERIFICATION_NOT_IMPLEMENTED",
    `Google Play verification chưa được triển khai cho package ${packageName}.`
  );
}

export async function completeGooglePlayPurchase(params: {
  userId: string;
  purchaseToken: string;
  productId: string;
  orderId?: string | null;
  providerReference?: string | null;
  rawPayload?: Record<string, unknown>;
}) {
  const verification = await verifyGooglePlayPurchaseToken({
    purchaseToken: params.purchaseToken,
    productId: params.productId,
    orderId: params.orderId ?? null
  });
  if (!verification.ok) {
    return { ok: false, error: verification, alreadyProcessed: false, credited: false };
  }

  const mapped = await mapGoogleProductToCoinPack(params.productId);
  if (!mapped.ok || !mapped.coinPack) {
    return { ok: false, error: mapped.error, alreadyProcessed: false, credited: false };
  }

  const providerReference =
    params.providerReference?.trim() ||
    buildProviderReference({
      orderId: params.orderId ?? null,
      purchaseToken: params.purchaseToken,
      productId: params.productId
    });

  const existedByReference = await getCheckoutSessionByProviderReference(providerReference);
  const existedByKeys = await findGooglePlayCheckoutByPurchaseKeys({
    purchaseToken: params.purchaseToken,
    orderId: params.orderId ?? null,
    productId: params.productId
  });
  const existed = existedByReference.data ?? existedByKeys.data ?? null;

  if (existed) {
    if (existed.status === "paid") {
      return {
        ok: true,
        alreadyProcessed: true,
        credited: false,
        sessionId: existed.id,
        providerReference
      };
    }

    const completed = await completeCheckoutPayment({
      sessionId: existed.id,
      providerReference,
      rawPayload: {
        ...(params.rawPayload ?? {}),
        purchaseToken: params.purchaseToken,
        productId: params.productId,
        orderId: params.orderId ?? null
      }
    });
    return {
      ok: completed.ok,
      alreadyProcessed: completed.alreadyProcessed,
      credited: completed.ok && !completed.alreadyProcessed,
      sessionId: existed.id,
      providerReference,
      error: completed.error
    };
  }

  const config = await getMonetizationConfig({ includePrivate: true });
  const amounts = calculateChannelAmounts(
    mapped.coinPack.price_vnd,
    "google_play_billing",
    config.settings
  );

  const created = await createCheckoutSessionRecord({
    userId: params.userId,
    coinPackId: mapped.coinPack.id,
    paymentChannel: "google_play_billing",
    provider: "google_play_billing",
    providerProductId: params.productId,
    providerReference,
    grossAmountVnd: mapped.coinPack.price_vnd,
    providerFeeVnd: 0,
    storeFeeVnd: amounts.storeFeeVnd,
    netAmountVnd: amounts.netAmountVnd,
    currency: mapped.coinPack.currency,
    baseCoinAmount: mapped.coinPack.base_coin_amount,
    bonusCoinAmount: mapped.coinPack.bonus_coin_amount,
    platform: "android",
    providerPayload: {
      source: "google_play_billing",
      purchaseToken: params.purchaseToken,
      orderId: params.orderId ?? null,
      productId: params.productId,
      verification: verification.metadata ?? {}
    }
  });

  if (!created.data) {
    return {
      ok: false,
      error: safeError(
        "GOOGLE_PLAY_CHECKOUT_CREATE_FAILED",
        created.error ?? "Không thể tạo checkout cho Google Play purchase."
      ),
      alreadyProcessed: false,
      credited: false
    };
  }

  const completed = await completeCheckoutPayment({
    sessionId: created.data.id,
    providerReference,
    rawPayload: {
      ...(params.rawPayload ?? {}),
      purchaseToken: params.purchaseToken,
      productId: params.productId,
      orderId: params.orderId ?? null
    }
  });

  return {
    ok: completed.ok,
    alreadyProcessed: completed.alreadyProcessed,
    credited: completed.ok && !completed.alreadyProcessed,
    sessionId: created.data.id,
    providerReference,
    error: completed.error
  };
}

export async function handleGooglePlayNotification(payload: Record<string, unknown>) {
  const purchaseToken = String(payload.purchaseToken ?? "").trim();
  const productId = String(payload.productId ?? "").trim();
  const orderId = String(payload.orderId ?? "").trim() || null;
  const userId = String(payload.userId ?? "").trim() || null;

  if (!purchaseToken || !productId || !userId) {
    return {
      ok: false,
      error: safeError(
        "GOOGLE_PLAY_INVALID_PAYLOAD",
        "Google Play notification thiếu userId/purchaseToken/productId."
      )
    };
  }

  return completeGooglePlayPurchase({
    userId,
    purchaseToken,
    productId,
    orderId,
    rawPayload: payload
  });
}
