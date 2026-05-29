import { buildStudioHelpFaq } from "@/lib/content/studio-help";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import { getContactSettings } from "@/lib/settings/get-contact-settings";
import type { ContactSettings } from "@/types/contact-settings";
import type { StudioHelpFaqItem } from "@/lib/content/studio-help";

export type StudioHelpPageData = {
  contact: ContactSettings;
  faq: StudioHelpFaqItem[];
  minWithdrawAmountVnd: number;
  payoutsEnabled: boolean;
};

export async function getStudioHelpPageData(): Promise<StudioHelpPageData> {
  const [{ settings: contact }, monetization] = await Promise.all([
    getContactSettings(),
    buildStudioMonetizationConfigView({ includePrivate: false })
  ]);

  return {
    contact,
    faq: buildStudioHelpFaq({
      minWithdrawAmountVnd: monetization.minWithdrawAmountVnd,
      payoutsEnabled: monetization.payoutsEnabled
    }),
    minWithdrawAmountVnd: monetization.minWithdrawAmountVnd,
    payoutsEnabled: monetization.payoutsEnabled
  };
}
