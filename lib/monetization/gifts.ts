import { getMonetizationConfig } from "@/lib/monetization/config";
import { getActiveVirtualGifts } from "@/lib/supabase/virtual-gifts";

export async function getEnabledGiftCatalog() {
  const config = await getMonetizationConfig();
  if (
    !Boolean(config.settings["monetization.enabled"]) ||
    !Boolean(config.settings["coin.enabled"]) ||
    !Boolean(config.settings["virtual_gifts.enabled"])
  ) {
    return { data: [], error: null };
  }

  return getActiveVirtualGifts();
}
