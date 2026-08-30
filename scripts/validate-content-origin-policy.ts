import { getStoryMonetizationCapabilities } from "@/lib/content-origin/content-origin-policy";
import { defaultContentOriginPolicySettings } from "@/lib/settings/content-origin-policy-settings";

type ValidationResult = {
  name: string;
  passed: boolean;
  details: string;
};

function validate(name: string, predicate: () => void): ValidationResult {
  try {
    predicate();
    return { name, passed: true, details: "OK" };
  } catch (error) {
    return {
      name,
      passed: false,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

function expectTrue(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

function expectFalse(value: boolean, message: string) {
  if (value) throw new Error(message);
}

function expectReasonIncludes(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) {
    throw new Error(`Missing reason code "${reason}" in [${reasons.join(", ")}]`);
  }
}

const settings = defaultContentOriginPolicySettings;

const originalFull = getStoryMonetizationCapabilities(
  {
    content_origin: "original",
    rights_status: "verified",
    monetization_policy: "full"
  },
  settings
);

const translationUnverified = getStoryMonetizationCapabilities(
  {
    content_origin: "translation",
    rights_status: "unverified",
    monetization_policy: "ads_tips_allowed"
  },
  settings
);

const translationVerifiedAdsTips = getStoryMonetizationCapabilities(
  {
    content_origin: "translation",
    rights_status: "verified",
    monetization_policy: "ads_tips_allowed"
  },
  settings
);

const translationRejected = getStoryMonetizationCapabilities(
  {
    content_origin: "translation",
    rights_status: "rejected",
    monetization_policy: "no_monetization"
  },
  settings
);

const checks: ValidationResult[] = [
  validate("original can sell when policy full", () => {
    expectTrue(originalFull.canSellChapters, "Original story cannot sell chapters.");
    expectTrue(originalFull.canSellStoryBundle, "Original story cannot sell bundle.");
  }),
  validate("translation unverified cannot sell chapters", () => {
    expectFalse(
      translationUnverified.canSellChapters,
      "Unverified translation can still sell chapters."
    );
  }),
  validate("translation unverified cannot sell bundle", () => {
    expectFalse(
      translationUnverified.canSellStoryBundle,
      "Unverified translation can still sell bundles."
    );
  }),
  validate("translation verified still cannot sell chapters/bundle", () => {
    expectFalse(
      translationVerifiedAdsTips.canSellChapters,
      "Verified translation can still sell chapters."
    );
    expectFalse(
      translationVerifiedAdsTips.canSellStoryBundle,
      "Verified translation can still sell bundle."
    );
  }),
  validate("translation verified can ads/tips only when ads_tips_allowed", () => {
    expectTrue(
      translationVerifiedAdsTips.canReceiveTips,
      "Verified translation with ads_tips_allowed cannot receive tips."
    );
    expectTrue(
      translationVerifiedAdsTips.canShareAdsRevenue,
      "Verified translation with ads_tips_allowed cannot share ads revenue."
    );
    const translationVerifiedNoMonetization = getStoryMonetizationCapabilities(
      {
        content_origin: "translation",
        rights_status: "verified",
        monetization_policy: "no_monetization"
      },
      settings
    );
    expectFalse(
      translationVerifiedNoMonetization.canReceiveTips,
      "Verified translation with no_monetization can receive tips."
    );
    expectFalse(
      translationVerifiedNoMonetization.canShareAdsRevenue,
      "Verified translation with no_monetization can share ads revenue."
    );
  }),
  validate("translation rejected cannot ads/tips", () => {
    expectFalse(translationRejected.canReceiveTips, "Rejected translation can receive tips.");
    expectFalse(
      translationRejected.canShareAdsRevenue,
      "Rejected translation can share ads revenue."
    );
  }),
  validate("policy engine emits reason codes", () => {
    expectTrue(translationUnverified.reasonCodes.length > 0, "No reason codes for unverified.");
    expectReasonIncludes(translationUnverified.reasonCodes, "TRANSLATION_CHAPTER_SALES_BLOCKED");
    expectReasonIncludes(translationUnverified.reasonCodes, "TRANSLATION_RIGHTS_UNVERIFIED");
    expectReasonIncludes(translationRejected.reasonCodes, "TRANSLATION_RIGHTS_REJECTED");
  })
];

const passed = checks.filter((c) => c.passed).length;
const failed = checks.length - passed;

console.log("[validate-content-origin-policy] Results");
for (const check of checks) {
  console.log(`- ${check.passed ? "PASS" : "FAIL"}: ${check.name} :: ${check.details}`);
}
console.log(`\nSummary: ${passed}/${checks.length} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
}
