"use server";

import { randomUUID } from "crypto";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getOriginalsCandidateRecommendations } from "@/lib/originals/candidate-scoring";
import {
  createIpDeal,
  createIpDealFinancial,
  getStoryOriginalStatus,
  listIpDealFinancials,
  listIpDealsForAdmin,
  listStoryOriginalStatusesForAdmin,
  upsertStoryOriginalStatus
} from "@/lib/data/originals";
import { createTransaction } from "@/lib/data/transactions";
import type { IpDealStatus, IpDealType, IpFinancialType, StoryOriginalStatus } from "@/types/originals";

async function isOriginalsEnabled() {
  const { settings } = await getMonetizationConfig({ includePrivate: true });
  return Boolean(settings["monetization.enabled"]) && Boolean(settings["originals_enabled"]);
}

async function assertOriginalsStaff() {
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { ok: false as const, userId: null, error: auth.error };
  }
  return { ok: true as const, userId: auth.userId, error: null };
}

export async function adminUpsertStoryOriginalStatusAction(input: {
  storyId: string;
  creatorUserId: string;
  status: StoryOriginalStatus;
  note?: string;
}) {
  const auth = await assertOriginalsStaff();
  if (!auth.ok) return { ok: false, error: auth.error, data: null };
  if (!(await isOriginalsEnabled())) return { ok: false, error: "Originals đang tắt.", data: null };
  const result = await upsertStoryOriginalStatus({
    storyId: input.storyId,
    creatorUserId: input.creatorUserId,
    status: input.status,
    selectedBy: auth.userId,
    note: input.note ?? null
  });
  return { ok: Boolean(result.data), error: result.error, data: result.data };
}

export async function adminCreateIpDealAction(input: {
  storyId: string;
  creatorUserId: string;
  dealType: IpDealType;
  rights: Record<string, unknown>;
  status: IpDealStatus;
  startDate?: string;
  endDate?: string;
  advanceAmountVnd?: number;
  revenueShare?: Record<string, unknown>;
  adminNote?: string;
}) {
  const auth = await assertOriginalsStaff();
  if (!auth.ok) return { ok: false, error: auth.error, data: null };
  if (!(await isOriginalsEnabled())) return { ok: false, error: "Originals đang tắt.", data: null };
  const result = await createIpDeal({
    storyId: input.storyId,
    creatorUserId: input.creatorUserId,
    dealType: input.dealType,
    rights: input.rights,
    status: input.status,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    advanceAmountVnd: input.advanceAmountVnd ?? null,
    revenueShare: input.revenueShare ?? null,
    adminNote: input.adminNote ?? null,
    createdBy: auth.userId
  });
  return { ok: Boolean(result.data), error: result.error, data: result.data };
}

export async function adminCreateIpDealFinancialAction(input: {
  dealId: string;
  type: IpFinancialType;
  amountVnd: number;
  description?: string;
  creatorUserId: string;
  shouldCreateLedger?: boolean;
}) {
  const auth = await assertOriginalsStaff();
  if (!auth.ok) return { ok: false, error: auth.error, data: null };
  if (!(await isOriginalsEnabled())) return { ok: false, error: "Originals đang tắt.", data: null };

  let transactionId: string | null = null;
  if (input.shouldCreateLedger && input.amountVnd > 0) {
    const tx = await createTransaction({
      transactionCode: `IPPAY-${input.dealId}-${randomUUID()}`,
      type: "creator_bonus",
      direction: "credit",
      source: "system",
      status: "completed",
      creatorUserId: input.creatorUserId,
      moneyAmountVnd: input.amountVnd,
      creatorGrossVnd: input.amountVnd,
      creatorNetVnd: input.amountVnd,
      metadata: {
        ip_deal_id: input.dealId,
        ip_financial_type: input.type
      }
    });
    transactionId = tx.data?.id ?? null;
  }

  const result = await createIpDealFinancial({
    dealId: input.dealId,
    type: input.type,
    amountVnd: input.amountVnd,
    description: input.description ?? null,
    transactionId
  });
  return { ok: Boolean(result.data), error: result.error, data: result.data };
}

export async function getAdminOriginalsDashboardData() {
  const enabled = await isOriginalsEnabled();
  if (!enabled) {
    return {
      enabled: false,
      storyStatuses: [],
      deals: [],
      candidateRecommendations: [],
      dealFinancialsByDeal: {} as Record<string, Awaited<ReturnType<typeof listIpDealFinancials>>["data"]>
    };
  }
  const [storyStatuses, deals, candidateRecommendations] = await Promise.all([
    listStoryOriginalStatusesForAdmin(200),
    listIpDealsForAdmin(200),
    getOriginalsCandidateRecommendations(20)
  ]);
  const dealFinancialsByDeal: Record<string, Awaited<ReturnType<typeof listIpDealFinancials>>["data"]> = {};
  for (const deal of deals.data) {
    const financials = await listIpDealFinancials(deal.id);
    dealFinancialsByDeal[deal.id] = financials.data;
  }
  return {
    enabled: true,
    storyStatuses: storyStatuses.data,
    deals: deals.data,
    candidateRecommendations,
    dealFinancialsByDeal
  };
}

export async function getStoryOriginalPublicStatus(storyId: string) {
  if (!(await isOriginalsEnabled())) return null;
  const status = await getStoryOriginalStatus(storyId);
  return status.data?.status === "original" ? status.data : null;
}
