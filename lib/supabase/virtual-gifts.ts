import { createClient } from "@/lib/supabase/server";
import type { VirtualGift } from "@/types/gift";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapGift(row: Record<string, unknown>): VirtualGift {
  return {
    id: String(row.id),
    key: String(row.key),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    coin_price: toNumber(row.coin_price),
    icon_url: (row.icon_url as string | null) ?? null,
    emoji: (row.emoji as string | null) ?? null,
    rarity: row.rarity as VirtualGift["rarity"],
    is_active: Boolean(row.is_active),
    sort_order: toNumber(row.sort_order),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function getActiveVirtualGifts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("virtual_gifts")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { data: [] as VirtualGift[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapGift),
    error: null
  };
}

export async function getVirtualGiftsForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("virtual_gifts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { data: [] as VirtualGift[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapGift),
    error: null
  };
}

export async function getVirtualGiftById(giftId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("virtual_gifts")
    .select("*")
    .eq("id", giftId)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? "Gift not found." };
  return { data: mapGift(data as Record<string, unknown>), error: null };
}

export async function upsertVirtualGift(input: {
  id?: string;
  key: string;
  name: string;
  description?: string | null;
  coinPrice: number;
  iconUrl?: string | null;
  emoji?: string | null;
  rarity: VirtualGift["rarity"];
  isActive: boolean;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("virtual_gifts")
    .upsert(
      {
        id: input.id,
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        coin_price: input.coinPrice,
        icon_url: input.iconUrl ?? null,
        emoji: input.emoji ?? null,
        rarity: input.rarity,
        is_active: input.isActive,
        sort_order: input.sortOrder
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not save gift." };
  }
  return { data: mapGift(data as Record<string, unknown>), error: null };
}
