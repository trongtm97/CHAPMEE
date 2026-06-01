"use server";

import { createStudioWithdrawalRequest } from "@/lib/studio/create-withdrawal-request";
import {
  bulkUpdateStoryMonetization,
  exportMonetizationStoriesCsv,
  type BulkMonetizationInput
} from "@/lib/studio/bulk-update-story-monetization";
import {
  bulkUpdateChapterMonetization,
  type BulkChapterMonetizationAction
} from "@/lib/studio/bulk-update-chapter-monetization";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import {
  getMonetizationChaptersPage,
  getStoryMonetizationDetail,
  type MonetizationChaptersQuery
} from "@/lib/studio/get-monetization-chapters-page";
import { getMonetizationStoriesPage } from "@/lib/studio/monetization-stories-query";
import {
  saveStoryMonetizationSettings,
  updateChapterMonetizationSetting
} from "@/lib/studio/save-story-monetization-settings";
import { updateCreatorTipSettings } from "@/lib/studio/update-creator-tip-settings";
import { updateStoryMonetization } from "@/lib/studio/update-story-monetization";
import type { PayoutMethod } from "@/types/payout";
import type {
  StudioMonetizationStoriesPageResult,
  StudioMonetizationStoriesQuery
} from "@/types/studio-monetization-stories";

export async function studioUpdateStoryMonetizationAction(input: {
  storyId: string;
  monetizationEnabled: boolean;
  freeChaptersCount: number;
  coinPrice: number | null;
}) {
  return updateStoryMonetization(input);
}

export async function studioSaveStoryMonetizationSettingsAction(
  input: Parameters<typeof saveStoryMonetizationSettings>[0]
) {
  return saveStoryMonetizationSettings(input);
}

export async function studioUpdateChapterMonetizationAction(
  input: Parameters<typeof updateChapterMonetizationSetting>[0]
) {
  return updateChapterMonetizationSetting(input);
}

export async function studioBulkChapterMonetizationAction(input: {
  storyId: string;
  chapterIds: string[];
  action: BulkChapterMonetizationAction;
  priceCoin?: number | null;
  overwriteOverrides?: boolean;
}) {
  return bulkUpdateChapterMonetization(input);
}

export async function studioFetchStoryMonetizationDetailAction(storyId: string) {
  const state = await getCurrentCreatorProfile();
  if (!state.creatorProfile || !state.user) {
    return { data: null, error: "Bạn cần đăng nhập Studio." };
  }
  return getStoryMonetizationDetail(storyId, state.user.id);
}

export async function studioFetchMonetizationChaptersAction(query: MonetizationChaptersQuery) {
  return getMonetizationChaptersPage(query);
}

export async function studioExportMonetizationCsvAction(
  scope: import("@/types/studio-monetization-stories").StudioMonetizationBulkScope,
  selectedStoryIds: string[]
) {
  return exportMonetizationStoriesCsv(scope, selectedStoryIds);
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

export async function studioFetchMonetizationStoriesAction(
  query: StudioMonetizationStoriesQuery
): Promise<StudioMonetizationStoriesPageResult> {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile || !state.user) {
    return {
      rows: [],
      totalCount: 0,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: 1,
      error: "Bạn cần đăng nhập Studio."
    };
  }

  return getMonetizationStoriesPage(state.creatorProfile, state.user.id, query);
}

export async function studioBulkMonetizationAction(input: BulkMonetizationInput) {
  return bulkUpdateStoryMonetization(input);
}

export async function studioFetchMonetizationTransactionsAction(input: {
  page: number;
  pageSize: number;
  filter: import("@/types/studio-monetization-dashboard").StudioTransactionFilter;
  search?: string;
}) {
  const state = await getCurrentCreatorProfile();
  if (!state.user) {
    return {
      rows: [],
      totalCount: 0,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: 1,
      error: "Bạn cần đăng nhập Studio."
    };
  }
  const { getCreatorTransactionsPage } = await import(
    "@/lib/studio/get-creator-transactions-page"
  );
  return getCreatorTransactionsPage(state.user.id, input);
}
