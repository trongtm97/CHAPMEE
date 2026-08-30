import { getStoryMonetizationCapabilities } from "@/lib/content-origin/content-origin-policy";
import { defaultContentOriginPolicySettings } from "@/lib/settings/content-origin-policy-settings";

function printCase(name: string, data: Parameters<typeof getStoryMonetizationCapabilities>[0]) {
  const result = getStoryMonetizationCapabilities(
    data,
    defaultContentOriginPolicySettings
  );
  console.log(`\n[${name}]`);
  console.log(JSON.stringify(result, null, 2));
}

printCase("original_story", {
  content_origin: "original",
  rights_status: "verified",
  monetization_policy: "full"
});

printCase("translation_unverified", {
  content_origin: "translation",
  rights_status: "unverified",
  monetization_policy: "ads_tips_allowed"
});

printCase("translation_verified_ads_tips_allowed", {
  content_origin: "translation",
  rights_status: "verified",
  monetization_policy: "ads_tips_allowed"
});

printCase("translation_rejected", {
  content_origin: "translation",
  rights_status: "rejected",
  monetization_policy: "ads_tips_allowed"
});

