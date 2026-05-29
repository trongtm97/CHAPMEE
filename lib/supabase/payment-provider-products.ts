import { createClient } from "@/lib/supabase/server";
import type { PaymentChannel, PaymentProvider, PaymentProviderProduct } from "@/types/payment";

function mapProduct(row: Record<string, unknown>): PaymentProviderProduct {
  return {
    id: String(row.id),
    provider: row.provider as PaymentProvider,
    payment_channel: row.payment_channel as PaymentChannel,
    product_id: String(row.product_id),
    coin_pack_id: String(row.coin_pack_id),
    is_active: Boolean(row.is_active),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function listPaymentProviderProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_provider_products")
    .select("*")
    .order("provider", { ascending: true })
    .order("product_id", { ascending: true });

  if (error) return { data: [] as PaymentProviderProduct[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapProduct),
    error: null
  };
}

export async function upsertPaymentProviderProduct(input: {
  id?: string;
  provider: PaymentProvider;
  paymentChannel: PaymentChannel;
  productId: string;
  coinPackId: string;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_provider_products")
    .upsert(
      {
        id: input.id,
        provider: input.provider,
        payment_channel: input.paymentChannel,
        product_id: input.productId,
        coin_pack_id: input.coinPackId,
        is_active: input.isActive,
        metadata: input.metadata ?? null
      },
      { onConflict: "provider,payment_channel,product_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not save provider product mapping." };
  }

  return { data: mapProduct(data as Record<string, unknown>), error: null };
}

export async function getPaymentProviderProductByProductId(input: {
  provider: PaymentProvider;
  paymentChannel: PaymentChannel;
  productId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_provider_products")
    .select("*")
    .eq("provider", input.provider)
    .eq("payment_channel", input.paymentChannel)
    .eq("product_id", input.productId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Provider product mapping not found."
    };
  }

  return { data: mapProduct(data as Record<string, unknown>), error: null };
}
