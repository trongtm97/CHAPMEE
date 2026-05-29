"use server";

import { createStudioWithdrawalRequest } from "@/lib/studio/create-withdrawal-request";
import { updateCreatorTipSettings } from "@/lib/studio/update-creator-tip-settings";
import { updateStoryMonetization } from "@/lib/studio/update-story-monetization";
import type { PayoutMethod } from "@/types/payout";

export async function studioUpdateStoryMonetizationAction(input: {
  storyId: string;
  monetizationEnabled: boolean;
  freeChaptersCount: number;
  coinPrice: number | null;
}) {
  return updateStoryMonetization(input);
}

export async function studioUpdateTipSettingsAction(input: {
  tipsAccepted: boolean;
  thankYouMessage: string;
}) {
  return updateCreatorTipSettings(input);
}

export async function studioWithdrawalRequestAction(input: {
  amountVnd: number;
  method: PayoutMethod;
  payoutAccountId?: string;
  accountHolderName?: string;
  bankName?: string;
  bankAccountNumberMasked?: string;
  walletPhoneMasked?: string;
  note?: string;
}) {
  return createStudioWithdrawalRequest(input);
}
