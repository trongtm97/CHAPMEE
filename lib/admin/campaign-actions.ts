"use server";

import { revalidatePath } from "next/cache";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import {
  createCampaign,
  createSponsor,
  linkCampaignToChallenge,
  updateCampaign
} from "@/lib/supabase/campaigns";
import { createTransaction } from "@/lib/transactions/ledger";

type CampaignActionState = {
  ok: boolean;
  message: string | null;
};

export const INITIAL_CAMPAIGN_ACTION_STATE: CampaignActionState = {
  ok: false,
  message: null
};

async function assertCampaignStaff() {
  return checkStaffPermission("admin.settings.update");
}

function toNumber(input: FormDataEntryValue | null) {
  const value = typeof input === "string" ? Number(input) : NaN;
  return Number.isFinite(value) ? value : null;
}

async function maybeCreateSponsorRevenueTransaction(input: {
  campaignId: string;
  amountVnd: number | null;
}) {
  if (!input.amountVnd || input.amountVnd <= 0) return;
  await createTransaction({
    type: "platform_fee",
    direction: "credit",
    source: "admin",
    status: "completed",
    moneyAmountVnd: input.amountVnd,
    metadata: {
      campaign_id: input.campaignId,
      revenue_type: "sponsored_campaign_revenue"
    }
  });
}

export async function createSponsorAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertCampaignStaff();
  if (!auth.ok) return { ok: false, message: auth.error };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Tên sponsor là bắt buộc." };

  const result = await createSponsor({
    name,
    logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
    contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
    status: (String(formData.get("status") ?? "active") as "active" | "inactive")
  });
  if (result.error) return { ok: false, message: result.error };

  revalidatePath("/admin/campaigns");
  return { ok: true, message: "Tạo sponsor thành công." };
}

export async function createCampaignAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertCampaignStaff();
  if (!auth.ok) return { ok: false, message: auth.error };

  const sponsorId = String(formData.get("sponsorId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!sponsorId || !name) {
    return { ok: false, message: "Campaign cần sponsor và tên chiến dịch." };
  }

  const result = await createCampaign({
    sponsorId,
    name,
    campaignType: String(formData.get("campaignType") ?? "sponsored_challenge") as
      | "sponsored_challenge"
      | "banner"
      | "native_card",
    status: String(formData.get("status") ?? "draft") as
      | "draft"
      | "active"
      | "paused"
      | "ended",
    budgetVnd: toNumber(formData.get("budgetVnd")),
    revenueVnd: toNumber(formData.get("revenueVnd")),
    startsAt: String(formData.get("startsAt") ?? "").trim() || null,
    endsAt: String(formData.get("endsAt") ?? "").trim() || null,
    ctaText: String(formData.get("ctaText") ?? "").trim() || null,
    ctaUrl: String(formData.get("ctaUrl") ?? "").trim() || null,
    disclosureText: String(formData.get("disclosureText") ?? "").trim() || "Được tài trợ"
  });
  if (result.error || !result.data) return { ok: false, message: result.error };

  await maybeCreateSponsorRevenueTransaction({
    campaignId: result.data.id,
    amountVnd: result.data.revenueVnd
  });

  revalidatePath("/admin/campaigns");
  revalidatePath("/challenges");
  revalidatePath("/community");
  revalidatePath("/discover");
  revalidatePath("/admin/finance");
  return { ok: true, message: "Tạo campaign thành công." };
}

export async function linkCampaignChallengeAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertCampaignStaff();
  if (!auth.ok) return { ok: false, message: auth.error };

  const challengeId = String(formData.get("challengeId") ?? "").trim();
  const campaignId = String(formData.get("campaignId") ?? "").trim() || null;
  if (!challengeId) return { ok: false, message: "Challenge không hợp lệ." };

  const result = await linkCampaignToChallenge({ challengeId, campaignId });
  if (result.error) return { ok: false, message: result.error };

  revalidatePath("/admin/campaigns");
  revalidatePath("/challenges");
  return { ok: true, message: "Đã cập nhật linked campaign cho challenge." };
}

export async function updateCampaignAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertCampaignStaff();
  if (!auth.ok) return { ok: false, message: auth.error };

  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) return { ok: false, message: "Campaign không hợp lệ." };

  const result = await updateCampaign({
    campaignId,
    status: String(formData.get("status") ?? "") as
      | "draft"
      | "active"
      | "paused"
      | "ended",
    budgetVnd: toNumber(formData.get("budgetVnd")),
    revenueVnd: toNumber(formData.get("revenueVnd")),
    ctaText: String(formData.get("ctaText") ?? "").trim() || null,
    ctaUrl: String(formData.get("ctaUrl") ?? "").trim() || null
  });

  if (result.error || !result.data) return { ok: false, message: result.error };

  await maybeCreateSponsorRevenueTransaction({
    campaignId: result.data.id,
    amountVnd: result.data.revenueVnd
  });

  revalidatePath("/admin/campaigns");
  revalidatePath("/challenges");
  revalidatePath("/community");
  revalidatePath("/discover");
  revalidatePath("/admin/finance");
  return { ok: true, message: "Đã cập nhật campaign." };
}
