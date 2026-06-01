"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import {
  CAMPAIGN_ARCHIVE_PERMISSIONS,
  CAMPAIGN_CREATE_PERMISSIONS,
  CAMPAIGN_PAUSE_PERMISSIONS,
  CAMPAIGN_SETTINGS_UPDATE_PERMISSIONS,
  CAMPAIGN_UPDATE_PERMISSIONS,
  SPONSOR_MANAGE_PERMISSIONS
} from "@/lib/auth/campaign-permissions";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import {
  parseCampaignFormData,
  parseSponsorFormData,
  validateCampaignActivation,
  validateCampaignForm,
  validateSponsorForm
} from "@/lib/campaigns/validation";
import {
  createCampaign,
  createSponsor,
  getCampaignCenterSettings,
  linkCampaignToChallenge,
  saveCampaignCenterSettings,
  updateCampaignFull,
  updateCampaignStatus,
  updateSponsor
} from "@/lib/supabase/campaigns";
import { createTransaction } from "@/lib/transactions/ledger";
import type { CampaignCenterSettings, CampaignStatus } from "@/types/campaign";

type CampaignActionState = {
  ok: boolean;
  message: string | null;
};

export const INITIAL_CAMPAIGN_ACTION_STATE: CampaignActionState = {
  ok: false,
  message: null
};

async function assertCreateCampaign() {
  return checkStaffAnyPermission(CAMPAIGN_CREATE_PERMISSIONS);
}

async function assertUpdateCampaign() {
  return checkStaffAnyPermission(CAMPAIGN_UPDATE_PERMISSIONS);
}

async function assertPauseCampaign() {
  return checkStaffAnyPermission(CAMPAIGN_PAUSE_PERMISSIONS);
}

async function assertArchiveCampaign() {
  return checkStaffAnyPermission(CAMPAIGN_ARCHIVE_PERMISSIONS);
}

async function assertManageSponsor() {
  return checkStaffAnyPermission(SPONSOR_MANAGE_PERMISSIONS);
}

async function assertUpdateSettings() {
  return checkStaffAnyPermission(CAMPAIGN_SETTINGS_UPDATE_PERMISSIONS);
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

function revalidateCampaignPaths() {
  revalidatePath("/admin/campaigns");
  revalidatePath("/challenges");
  revalidatePath("/community");
  revalidatePath("/discover");
  revalidatePath("/admin/finance");
}

export async function createSponsorAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertManageSponsor();
  if (!auth.ok) return { ok: false, message: auth.error };

  const input = parseSponsorFormData(formData);
  const validation = validateSponsorForm(input);
  if (!validation.ok) return { ok: false, message: validation.error };

  const result = await createSponsor(input);
  if (result.error || !result.data) return { ok: false, message: result.error };

  await createAdminAuditLog({
    action: "sponsor_create",
    targetType: "sponsor",
    targetId: result.data.id,
    after: result.data as unknown as Record<string, unknown>
  });

  revalidatePath("/admin/campaigns");
  return { ok: true, message: "Tạo sponsor thành công." };
}

export async function updateSponsorAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertManageSponsor();
  if (!auth.ok) return { ok: false, message: auth.error };

  const sponsorId = String(formData.get("sponsorId") ?? "").trim();
  if (!sponsorId) return { ok: false, message: "Sponsor không hợp lệ." };

  const input = parseSponsorFormData(formData);
  const validation = validateSponsorForm(input);
  if (!validation.ok) return { ok: false, message: validation.error };

  const result = await updateSponsor({ ...input, sponsorId });
  if (result.error || !result.data) return { ok: false, message: result.error };

  await createAdminAuditLog({
    action: "sponsor_update",
    targetType: "sponsor",
    targetId: sponsorId,
    after: result.data as unknown as Record<string, unknown>
  });

  revalidatePath("/admin/campaigns");
  return { ok: true, message: "Cập nhật sponsor thành công." };
}

export async function createCampaignAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertCreateCampaign();
  if (!auth.ok) return { ok: false, message: auth.error };

  const input = parseCampaignFormData(formData);
  const settings = (await getCampaignCenterSettings()).data;
  const validation = validateCampaignActivation(input, settings);
  if (!validation.ok) return { ok: false, message: validation.error };

  const result = await createCampaign(input);
  if (result.error || !result.data) return { ok: false, message: result.error };

  if (input.challengeId && input.campaignType === "sponsored_challenge") {
    await linkCampaignToChallenge({
      challengeId: input.challengeId,
      campaignId: result.data.id
    });
  }

  await maybeCreateSponsorRevenueTransaction({
    campaignId: result.data.id,
    amountVnd: result.data.revenueVnd
  });

  await createAdminAuditLog({
    action: "campaign_create",
    targetType: "campaign",
    targetId: result.data.id,
    after: result.data as unknown as Record<string, unknown>
  });

  revalidateCampaignPaths();
  return { ok: true, message: "Tạo campaign thành công." };
}

export async function updateCampaignAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertUpdateCampaign();
  if (!auth.ok) return { ok: false, message: auth.error };

  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) return { ok: false, message: "Campaign không hợp lệ." };

  const input = parseCampaignFormData(formData);
  const settings = (await getCampaignCenterSettings()).data;
  const validation = validateCampaignActivation(input, settings);
  if (!validation.ok) return { ok: false, message: validation.error };

  const result = await updateCampaignFull({ ...input, campaignId });
  if (result.error || !result.data) return { ok: false, message: result.error };

  if (input.challengeId !== undefined) {
    if (input.challengeId && input.campaignType === "sponsored_challenge") {
      await linkCampaignToChallenge({
        challengeId: input.challengeId,
        campaignId: result.data.id
      });
    }
  }

  await maybeCreateSponsorRevenueTransaction({
    campaignId: result.data.id,
    amountVnd: result.data.revenueVnd
  });

  await createAdminAuditLog({
    action: "campaign_update",
    targetType: "campaign",
    targetId: campaignId,
    after: result.data as unknown as Record<string, unknown>
  });

  revalidateCampaignPaths();
  return { ok: true, message: "Đã cập nhật campaign." };
}

export async function updateCampaignStatusAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const status = String(formData.get("status") ?? "") as CampaignStatus;
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) return { ok: false, message: "Campaign không hợp lệ." };

  const needsArchive = status === "archived";
  const auth = needsArchive
    ? await assertArchiveCampaign()
    : await assertPauseCampaign();
  if (!auth.ok) return { ok: false, message: auth.error };

  const result = await updateCampaignStatus({ campaignId, status });
  if (result.error || !result.data) return { ok: false, message: result.error };

  const actionMap: Record<string, string> = {
    active: "campaign_activate",
    paused: "campaign_pause",
    ended: "campaign_end",
    archived: "campaign_archive"
  };

  await createAdminAuditLog({
    action: actionMap[status] ?? "campaign_update",
    targetType: "campaign",
    targetId: campaignId,
    after: { status }
  });

  revalidateCampaignPaths();
  const labelMap: Record<string, string> = {
    paused: "Đã tạm dừng campaign.",
    ended: "Đã kết thúc campaign.",
    archived: "Đã lưu trữ campaign.",
    active: "Đã kích hoạt campaign."
  };
  return { ok: true, message: labelMap[status] ?? "Đã cập nhật trạng thái." };
}

export async function linkCampaignChallengeAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertUpdateCampaign();
  if (!auth.ok) return { ok: false, message: auth.error };

  const challengeId = String(formData.get("challengeId") ?? "").trim();
  const campaignId = String(formData.get("campaignId") ?? "").trim() || null;
  if (!challengeId) return { ok: false, message: "Challenge không hợp lệ." };

  const result = await linkCampaignToChallenge({ challengeId, campaignId });
  if (result.error) return { ok: false, message: result.error };

  revalidateCampaignPaths();
  return { ok: true, message: "Đã cập nhật liên kết challenge." };
}

export async function saveCampaignSettingsAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertUpdateSettings();
  if (!auth.ok) return { ok: false, message: auth.error };

  const settings: CampaignCenterSettings = {
    campaignsPublicEnabled: formData.get("campaignsPublicEnabled") === "on",
    sponsoredChallengeEnabled: formData.get("sponsoredChallengeEnabled") === "on",
    nativeCardEnabled: formData.get("nativeCardEnabled") === "on",
    bannerEnabled: formData.get("bannerEnabled") === "on",
    disclosureRequired: formData.get("disclosureRequired") === "on",
    maxActivePerPlacement: Math.max(1, toNumber(formData.get("maxActivePerPlacement")) ?? 3),
    reelsNativeFrequency: Math.max(1, toNumber(formData.get("reelsNativeFrequency")) ?? 8),
    discoverBannerMax: Math.max(0, toNumber(formData.get("discoverBannerMax")) ?? 2),
    communityFeedMax: Math.max(0, toNumber(formData.get("communityFeedMax")) ?? 2)
  };

  const result = await saveCampaignCenterSettings(settings);
  if (result.error) return { ok: false, message: result.error };

  await createAdminAuditLog({
    action: "campaign_settings_update",
    targetType: "campaign_settings",
    targetId: "1",
    after: settings as unknown as Record<string, unknown>
  });

  revalidateCampaignPaths();
  return { ok: true, message: "Đã lưu cấu hình Campaign Center." };
}

/** Legacy inline update — maps to status/budget quick edit */
export async function quickUpdateCampaignAction(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const auth = await assertUpdateCampaign();
  if (!auth.ok) return { ok: false, message: auth.error };

  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) return { ok: false, message: "Campaign không hợp lệ." };

  const input = parseCampaignFormData(formData);
  const validation = validateCampaignForm(input);
  if (!validation.ok) return { ok: false, message: validation.error };

  const result = await updateCampaignFull({ ...input, campaignId });
  if (result.error) return { ok: false, message: result.error };

  revalidateCampaignPaths();
  return { ok: true, message: "Đã cập nhật campaign." };
}
