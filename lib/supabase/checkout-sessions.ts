import { createClient } from "@/lib/supabase/server";
import type {
  CheckoutPlatform,
  CheckoutSession,
  CheckoutSessionStatus,
  PaymentChannel,
  PaymentProviderKey
} from "@/types/payment";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapCheckoutSession(row: Record<string, unknown>): CheckoutSession {
  const baseCoinAmount = toNumber(row.base_coin_amount ?? row.coin_amount);
  const bonusCoinAmount = toNumber(row.bonus_coin_amount);
  return {
    id: String(row.id),
    checkout_code: (row.checkout_code as string | null) ?? null,
    user_id: String(row.user_id),
    coin_pack_id: String(row.coin_pack_id),
    payment_channel: (row.payment_channel as PaymentChannel) ?? "web_sepay",
    provider: row.provider as PaymentProviderKey,
    provider_product_id: (row.provider_product_id as string | null) ?? null,
    provider_reference:
      (row.provider_reference as string | null) ??
      (row.payment_reference as string | null) ??
      null,
    status: row.status as CheckoutSessionStatus,
    amount_vnd: toNumber(row.amount_vnd ?? row.gross_amount_vnd),
    gross_amount_vnd: toNumber(row.gross_amount_vnd ?? row.amount_vnd),
    provider_fee_vnd: toNumber(row.provider_fee_vnd),
    store_fee_vnd: toNumber(row.store_fee_vnd),
    net_amount_vnd: toNumber(row.net_amount_vnd ?? row.amount_vnd),
    currency: String(row.currency ?? "VND"),
    base_coin_amount: baseCoinAmount,
    bonus_coin_amount: bonusCoinAmount,
    total_coin_amount: toNumber(
      row.total_coin_amount ?? baseCoinAmount + bonusCoinAmount
    ),
    payment_reference: (row.payment_reference as string | null) ?? null,
    platform: (row.platform as CheckoutPlatform) ?? "web",
    admin_note: (row.admin_note as string | null) ?? null,
    transfer_content: (row.transfer_content as string | null) ?? null,
    qr_url: (row.qr_url as string | null) ?? null,
    provider_payload: (row.provider_payload as Record<string, unknown> | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function createCheckoutSessionRecord(input: {
  checkoutCode?: string | null;
  userId: string;
  coinPackId: string;
  paymentChannel: PaymentChannel;
  provider: PaymentProviderKey;
  providerProductId?: string | null;
  providerReference?: string | null;
  grossAmountVnd: number;
  providerFeeVnd: number;
  storeFeeVnd: number;
  netAmountVnd: number;
  currency?: string;
  baseCoinAmount: number;
  bonusCoinAmount: number;
  platform?: CheckoutPlatform;
  transferContent?: string | null;
  qrUrl?: string | null;
  providerPayload?: Record<string, unknown>;
  expiresAt?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .insert({
      user_id: input.userId,
      coin_pack_id: input.coinPackId,
      checkout_code: input.checkoutCode ?? null,
      payment_channel: input.paymentChannel,
      provider: input.provider,
      provider_product_id: input.providerProductId ?? null,
      provider_reference: input.providerReference ?? null,
      status: "created",
      amount_vnd: input.grossAmountVnd,
      gross_amount_vnd: input.grossAmountVnd,
      provider_fee_vnd: input.providerFeeVnd,
      store_fee_vnd: input.storeFeeVnd,
      net_amount_vnd: input.netAmountVnd,
      currency: input.currency ?? "VND",
      base_coin_amount: input.baseCoinAmount,
      bonus_coin_amount: input.bonusCoinAmount,
      total_coin_amount: input.baseCoinAmount + input.bonusCoinAmount,
      platform: input.platform ?? "web",
      transfer_content: input.transferContent ?? null,
      qr_url: input.qrUrl ?? null,
      provider_payload: input.providerPayload ?? {},
      expires_at: input.expiresAt ?? null
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not create checkout session."
    };
  }

  return { data: mapCheckoutSession(data as Record<string, unknown>), error: null };
}

export async function getCheckoutSessionById(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Checkout session not found." };
  }

  return { data: mapCheckoutSession(data as Record<string, unknown>), error: null };
}

export async function getCheckoutSessionByProviderReference(providerReference: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("provider_reference", providerReference)
    .maybeSingle();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Checkout session not found by provider reference."
    };
  }

  return { data: mapCheckoutSession(data as Record<string, unknown>), error: null };
}

export async function findGooglePlayCheckoutByPurchaseKeys(input: {
  purchaseToken: string;
  orderId?: string | null;
  productId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("provider", "google_play_billing")
    .contains("provider_payload", {
      purchaseToken: input.purchaseToken,
      productId: input.productId
    })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return { data: mapCheckoutSession(data as Record<string, unknown>), error: null };
  }

  if (!input.orderId) {
    return { data: null, error: error?.message ?? "Checkout session not found." };
  }

  const fallback = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("provider", "google_play_billing")
    .contains("provider_payload", { orderId: input.orderId, productId: input.productId })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallback.error || !fallback.data) {
    return { data: null, error: fallback.error?.message ?? "Checkout session not found." };
  }

  return {
    data: mapCheckoutSession(fallback.data as Record<string, unknown>),
    error: null
  };
}

export async function listCheckoutSessionsForAdmin(
  limit = 30,
  filters?: {
    provider?: string;
    status?: string;
    checkoutCode?: string;
    userId?: string;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from("checkout_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filters?.provider) query = query.eq("provider", filters.provider);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.checkoutCode) query = query.eq("checkout_code", filters.checkoutCode);
  if (filters?.userId) query = query.eq("user_id", filters.userId);
  const { data, error } = await query;

  if (error) {
    return { data: [] as CheckoutSession[], error: error.message };
  }

  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapCheckoutSession),
    error: null
  };
}

export async function listCheckoutSessionsForUser(userId: string, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [] as CheckoutSession[], error: error.message };
  }

  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapCheckoutSession),
    error: null
  };
}

export async function updateCheckoutSessionStatus(input: {
  sessionId: string;
  status: CheckoutSessionStatus;
  providerPayload?: Record<string, unknown>;
  paymentReference?: string | null;
  providerReference?: string | null;
  paidAt?: string | null;
  adminNote?: string | null;
  transferContent?: string | null;
  qrUrl?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .update({
      status: input.status,
      provider_payload: input.providerPayload,
      payment_reference: input.paymentReference ?? undefined,
      provider_reference: input.providerReference ?? undefined,
      paid_at: input.paidAt ?? undefined,
      admin_note: input.adminNote ?? undefined,
      transfer_content: input.transferContent ?? undefined,
      qr_url: input.qrUrl ?? undefined
    })
    .eq("id", input.sessionId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not update checkout session."
    };
  }

  return { data: mapCheckoutSession(data as Record<string, unknown>), error: null };
}
