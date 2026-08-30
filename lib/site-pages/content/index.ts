import type { PlatformPageContentMeta } from "@/lib/site-pages/platform-page-types";
import { advertisingPolicyPage } from "@/lib/site-pages/content/advertising-policy-page";
import { communityGuidelinesPage } from "@/lib/site-pages/content/community-guidelines-page";
import { complaintsDisputesPage } from "@/lib/site-pages/content/complaints-disputes-page";
import { contentPolicyPage } from "@/lib/site-pages/content/content-policy-page";
import { cookiesPage } from "@/lib/site-pages/content/cookies-page";
import { copyrightPage } from "@/lib/site-pages/content/copyright-page";
import { creatorMonetizationPolicyPage } from "@/lib/site-pages/content/creator-monetization-policy-page";
import { creatorTermsPage } from "@/lib/site-pages/content/creator-terms-page";
import { creatorVerificationPolicyPage } from "@/lib/site-pages/content/creator-verification-policy-page";
import { dmcaPage } from "@/lib/site-pages/content/dmca-page";
import { marketplaceRegulationPage } from "@/lib/site-pages/content/marketplace-regulation-page";
import { paymentPolicyPage } from "@/lib/site-pages/content/payment-policy-page";
import { privacyPage } from "@/lib/site-pages/content/privacy-page";
import { refundPolicyPage } from "@/lib/site-pages/content/refund-policy-page";
import { serviceDeliveryPage } from "@/lib/site-pages/content/service-delivery-page";

export const PLATFORM_PAGE_CONTENT_PART2: Record<string, PlatformPageContentMeta> = {
  "/legal/privacy": privacyPage,
  "/legal/cookies": cookiesPage,
  "/legal/payment-policy": paymentPolicyPage,
  "/legal/refund-policy": refundPolicyPage,
  "/legal/service-delivery": serviceDeliveryPage,
  "/legal/complaints-disputes": complaintsDisputesPage
};

export const PLATFORM_PAGE_CONTENT_PART3: Record<string, PlatformPageContentMeta> = {
  "/legal/content-policy": contentPolicyPage,
  "/legal/community-guidelines": communityGuidelinesPage,
  "/legal/copyright": copyrightPage,
  "/legal/dmca": dmcaPage,
  "/legal/advertising-policy": advertisingPolicyPage
};

export const PLATFORM_PAGE_CONTENT_PART4: Record<string, PlatformPageContentMeta> = {
  "/legal/marketplace-regulation": marketplaceRegulationPage,
  "/legal/creator-terms": creatorTermsPage,
  "/legal/creator-monetization-policy": creatorMonetizationPolicyPage,
  "/legal/creator-verification-policy": creatorVerificationPolicyPage
};
