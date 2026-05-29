import { getMonetizationConfig } from "@/lib/monetization/config";

export async function isSponsoredContentEnabled() {
  const { settings } = await getMonetizationConfig();
  return (
    Boolean(settings["monetization.enabled"]) &&
    (Boolean(settings["sponsored_challenge.enabled"]) ||
      Boolean(settings["brand_campaigns.enabled"]))
  );
}
