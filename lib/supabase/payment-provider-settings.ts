import { createClient } from "@/lib/supabase/server";
import type { PaymentProviderKey, PaymentProviderSetting } from "@/types/payment";

function mapSetting(row: Record<string, unknown>): PaymentProviderSetting {
  return {
    id: String(row.id),
    provider_key: row.provider_key as PaymentProviderKey,
    enabled: Boolean(row.enabled),
    test_mode: Boolean(row.test_mode),
    public_config: (row.public_config as Record<string, unknown> | null) ?? null,
    private_config_reference: (row.private_config_reference as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function getPaymentProviderSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_provider_settings")
    .select("*")
    .order("provider_key", { ascending: true });

  if (error) return { data: [] as PaymentProviderSetting[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapSetting),
    error: null
  };
}

export async function getEnabledPaymentProviderSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_provider_settings")
    .select("*")
    .eq("enabled", true)
    .order("provider_key", { ascending: true });

  if (error) return { data: [] as PaymentProviderSetting[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapSetting),
    error: null
  };
}

export async function upsertPaymentProviderSetting(input: {
  providerKey: PaymentProviderKey;
  enabled: boolean;
  testMode: boolean;
  publicConfig?: Record<string, unknown>;
  privateConfigReference?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_provider_settings")
    .upsert(
      {
        provider_key: input.providerKey,
        enabled: input.enabled,
        test_mode: input.testMode,
        public_config: input.publicConfig ?? {},
        private_config_reference: input.privateConfigReference ?? null
      },
      { onConflict: "provider_key" }
    )
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not update payment provider setting."
    };
  }

  return { data: mapSetting(data as Record<string, unknown>), error: null };
}
