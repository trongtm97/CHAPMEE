"use server";

import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { upsertVirtualGift } from "@/lib/data/virtual-gifts";
import type { GiftRarity } from "@/types/gift";

export async function saveVirtualGiftAction(
  _prevState: { ok: boolean; error: string | null },
  formData: FormData
) {
  void _prevState;
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const result = await upsertVirtualGift({
    id: (formData.get("id") as string) || undefined,
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    coinPrice: Number(formData.get("coin_price") ?? 0),
    emoji: String(formData.get("emoji") ?? "").trim() || null,
    rarity: String(formData.get("rarity") ?? "common") as GiftRarity,
    isActive: String(formData.get("is_active") ?? "false") === "true",
    sortOrder: Number(formData.get("sort_order") ?? 0)
  });

  return { ok: Boolean(result.data), error: result.error };
}
