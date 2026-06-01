import {
  getDefaultPlacementForType,
  isPlacementAvailable
} from "@/lib/campaigns/constants";
import type {
  CampaignCenterSettings,
  CampaignFormInput,
  CampaignStatus,
  CampaignType,
  SponsorFormInput,
  SponsorStatus
} from "@/types/campaign";

const URL_PATTERN = /^https?:\/\/.+/i;

export type ValidationResult = { ok: true } | { ok: false; error: string };

function parseDate(value: string | null): number | null {
  if (!value?.trim()) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function validateExternalUrl(url: string | null): ValidationResult {
  if (!url?.trim()) return { ok: true };
  if (!URL_PATTERN.test(url.trim())) {
    return { ok: false, error: "URL ngoài phải bắt đầu bằng http:// hoặc https://." };
  }
  return { ok: true };
}

export function validateCampaignForm(input: CampaignFormInput): ValidationResult {
  if (!input.name.trim()) {
    return { ok: false, error: "Tên campaign là bắt buộc." };
  }

  if (!input.sponsorId.trim()) {
    return { ok: false, error: "Sponsor là bắt buộc với campaign tài trợ." };
  }

  if (input.budgetVnd !== null && input.budgetVnd < 0) {
    return { ok: false, error: "Budget không được âm." };
  }

  if (input.revenueVnd !== null && input.revenueVnd < 0) {
    return { ok: false, error: "Revenue không được âm." };
  }

  const startsAt = parseDate(input.startsAt);
  const endsAt = parseDate(input.endsAt);
  if (startsAt !== null && endsAt !== null && startsAt > endsAt) {
    return { ok: false, error: "Ngày bắt đầu không được sau ngày kết thúc." };
  }

  if (!input.disclosureText.trim()) {
    return { ok: false, error: "Disclosure text là bắt buộc với campaign tài trợ." };
  }

  if (input.targetType === "external_url") {
    const urlCheck = validateExternalUrl(input.ctaUrl);
    if (!urlCheck.ok) return urlCheck;
    if (!input.ctaUrl?.trim()) {
      return { ok: false, error: "Campaign external URL cần CTA URL hợp lệ." };
    }
  } else if (input.ctaUrl?.trim()) {
    const urlCheck = validateExternalUrl(input.ctaUrl);
    if (!urlCheck.ok) return urlCheck;
  }

  if (input.status === "active") {
    const placement = input.placement ?? getDefaultPlacementForType(input.campaignType);
    if (!placement) {
      return { ok: false, error: "Campaign active phải có vị trí hiển thị (placement)." };
    }
    if (!isPlacementAvailable(placement)) {
      return { ok: false, error: "Vị trí hiển thị chưa khả dụng, không thể kích hoạt campaign." };
    }
    if (startsAt !== null && startsAt > Date.now()) {
      return { ok: false, error: "Campaign chưa tới ngày bắt đầu — hãy chọn trạng thái 'Đã lên lịch'." };
    }
  }

  if (input.status === "scheduled") {
    if (startsAt === null) {
      return { ok: false, error: "Campaign đã lên lịch cần ngày bắt đầu." };
    }
  }

  return { ok: true };
}

export function validateCampaignActivation(
  input: CampaignFormInput,
  settings?: CampaignCenterSettings
): ValidationResult {
  const base = validateCampaignForm(input);
  if (!base.ok) return base;

  if (input.status !== "active" && input.status !== "scheduled") {
    return { ok: true };
  }

  if (settings && !settings.campaignsPublicEnabled) {
    return { ok: false, error: "Campaign public đang tắt trong Settings." };
  }

  if (settings) {
    if (input.campaignType === "sponsored_challenge" && !settings.sponsoredChallengeEnabled) {
      return { ok: false, error: "Sponsored challenge đang tắt trong Settings." };
    }
    if (input.campaignType === "native_card" && !settings.nativeCardEnabled) {
      return { ok: false, error: "Native card đang tắt trong Settings." };
    }
    if (input.campaignType === "banner" && !settings.bannerEnabled) {
      return { ok: false, error: "Banner đang tắt trong Settings." };
    }
  }

  return { ok: true };
}

export function parseCampaignFormData(formData: FormData): CampaignFormInput {
  const budgetRaw = String(formData.get("budgetVnd") ?? "").trim();
  const revenueRaw = String(formData.get("revenueVnd") ?? "").trim();
  const budgetVnd = budgetRaw ? Number(budgetRaw) : null;
  const revenueVnd = revenueRaw ? Number(revenueRaw) : null;

  return {
    sponsorId: String(formData.get("sponsorId") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    campaignType: String(formData.get("campaignType") ?? "sponsored_challenge") as CampaignType,
    placement: (String(formData.get("placement") ?? "").trim() || null) as CampaignFormInput["placement"],
    status: String(formData.get("status") ?? "draft") as CampaignStatus,
    budgetVnd: Number.isFinite(budgetVnd) ? budgetVnd : null,
    revenueVnd: Number.isFinite(revenueVnd) ? revenueVnd : null,
    startsAt: String(formData.get("startsAt") ?? "").trim() || null,
    endsAt: String(formData.get("endsAt") ?? "").trim() || null,
    disclosureText: String(formData.get("disclosureText") ?? "").trim() || "Được tài trợ",
    ctaText: String(formData.get("ctaText") ?? "").trim() || null,
    ctaUrl: String(formData.get("ctaUrl") ?? "").trim() || null,
    targetType: (String(formData.get("targetType") ?? "").trim() || null) as CampaignFormInput["targetType"],
    targetId: String(formData.get("targetId") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    adminNote: String(formData.get("adminNote") ?? "").trim() || null,
    challengeId: String(formData.get("challengeId") ?? "").trim() || null
  };
}

export function parseSponsorFormData(formData: FormData): SponsorFormInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
    logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
    status: String(formData.get("status") ?? "active") as SponsorStatus,
    notes: String(formData.get("notes") ?? "").trim() || null
  };
}

export function validateSponsorForm(input: SponsorFormInput): ValidationResult {
  if (!input.name.trim()) {
    return { ok: false, error: "Tên sponsor là bắt buộc." };
  }
  if (input.websiteUrl) {
    const check = validateExternalUrl(input.websiteUrl);
    if (!check.ok) return check;
  }
  return { ok: true };
}
