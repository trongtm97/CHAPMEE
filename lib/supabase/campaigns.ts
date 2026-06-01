import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import { getDefaultPlacementForType } from "@/lib/campaigns/constants";
import { isCampaignPubliclyVisible } from "@/lib/campaigns/visibility";
import type {
  BrandCampaignRecord,
  CampaignCenterSettings,
  CampaignFormInput,
  CampaignMetricsSummary,
  CampaignPlacement,
  CampaignStatus,
  CampaignTargetType,
  CampaignType,
  CampaignWithSponsor,
  SponsorFormInput,
  SponsorRecord,
  SponsorStatus,
  SponsorWithStats
} from "@/types/campaign";
import { DEFAULT_CAMPAIGN_CENTER_SETTINGS } from "@/types/campaign";

type SponsorRow = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  status: SponsorStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

type CampaignRow = {
  id: string;
  sponsor_id: string;
  name: string;
  campaign_type: CampaignType;
  placement?: CampaignPlacement | null;
  status: CampaignStatus;
  budget_vnd: number | null;
  revenue_vnd: number | null;
  starts_at: string | null;
  ends_at: string | null;
  cta_text: string | null;
  cta_url: string | null;
  target_type?: CampaignTargetType | null;
  target_id?: string | null;
  disclosure_text: string | null;
  description?: string | null;
  admin_note?: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  sponsors?: SponsorRow | SponsorRow[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function mapSponsor(row: SponsorRow): SponsorRecord {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    contactEmail: row.contact_email,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCampaign(row: CampaignRow): BrandCampaignRecord {
  return {
    id: row.id,
    sponsorId: row.sponsor_id,
    name: row.name,
    campaignType: row.campaign_type,
    placement: row.placement ?? getDefaultPlacementForType(row.campaign_type),
    status: row.status,
    budgetVnd: row.budget_vnd,
    revenueVnd: row.revenue_vnd,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    ctaText: row.cta_text,
    ctaUrl: row.cta_url,
    targetType: row.target_type ?? null,
    targetId: row.target_id ?? null,
    disclosureText: row.disclosure_text ?? "Được tài trợ",
    description: row.description ?? null,
    adminNote: row.admin_note ?? null,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const CAMPAIGN_SELECT =
  "id, sponsor_id, name, campaign_type, placement, status, budget_vnd, revenue_vnd, starts_at, ends_at, cta_text, cta_url, target_type, target_id, disclosure_text, description, admin_note, metadata, created_at, updated_at";

const LEGACY_CAMPAIGN_SELECT =
  "id, sponsor_id, name, campaign_type, status, budget_vnd, revenue_vnd, starts_at, ends_at, cta_text, cta_url, disclosure_text, metadata, created_at, updated_at";

const SPONSOR_SELECT =
  "id, name, logo_url, website_url, contact_email, status, notes, created_at, updated_at";

const LEGACY_SPONSOR_SELECT =
  "id, name, logo_url, website_url, contact_email, status, created_at, updated_at";

function campaignInsertPayload(input: CampaignFormInput) {
  const placement = input.placement ?? getDefaultPlacementForType(input.campaignType);
  return {
    sponsor_id: input.sponsorId,
    name: input.name.trim(),
    campaign_type: input.campaignType,
    placement,
    status: input.status,
    budget_vnd: input.budgetVnd ?? null,
    revenue_vnd: input.revenueVnd ?? null,
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    cta_text: input.ctaText?.trim() || null,
    cta_url: input.ctaUrl?.trim() || null,
    target_type: input.targetType ?? null,
    target_id: input.targetId?.trim() || null,
    disclosure_text: input.disclosureText?.trim() || "Được tài trợ",
    description: input.description?.trim() || null,
    admin_note: input.adminNote?.trim() || null
  };
}

export async function getSponsorsForAdmin() {
  const supabase = await createClient();
  const primary = await supabase
    .from("sponsors")
    .select(SPONSOR_SELECT)
    .order("created_at", { ascending: false });

  let rows = primary.data as SponsorRow[] | null;
  let queryError = primary.error;

  if (queryError && isMissingSchemaError(queryError)) {
    const legacy = await supabase
      .from("sponsors")
      .select(LEGACY_SPONSOR_SELECT)
      .order("created_at", { ascending: false });
    rows = legacy.data as SponsorRow[] | null;
    queryError = legacy.error;
  }

  if (queryError) {
    return { data: [] as SponsorRecord[], error: queryError.message };
  }

  return { data: ((rows ?? []) as SponsorRow[]).map(mapSponsor), error: null };
}

export async function getSponsorsWithStats(campaigns: BrandCampaignRecord[]) {
  const sponsors = await getSponsorsForAdmin();
  if (sponsors.error) return { data: [] as SponsorWithStats[], error: sponsors.error };

  const withStats: SponsorWithStats[] = sponsors.data.map((sponsor) => {
    const related = campaigns.filter((c) => c.sponsorId === sponsor.id);
    return {
      ...sponsor,
      campaignCount: related.length,
      totalRevenueVnd: related.reduce((sum, c) => sum + (c.revenueVnd ?? 0), 0)
    };
  });

  return { data: withStats, error: null };
}

export async function createSponsor(input: SponsorFormInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .insert({
      name: input.name.trim(),
      logo_url: input.logoUrl?.trim() || null,
      website_url: input.websiteUrl?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
      status: input.status ?? "active",
      notes: input.notes?.trim() || null
    })
    .select(SPONSOR_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể tạo sponsor." };
  }

  return { data: mapSponsor(data as SponsorRow), error: null };
}

export async function updateSponsor(input: SponsorFormInput & { sponsorId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .update({
      name: input.name.trim(),
      logo_url: input.logoUrl?.trim() || null,
      website_url: input.websiteUrl?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
      status: input.status,
      notes: input.notes?.trim() || null
    })
    .eq("id", input.sponsorId)
    .select(SPONSOR_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể cập nhật sponsor." };
  }

  return { data: mapSponsor(data as SponsorRow), error: null };
}

export async function getCampaignsForAdmin() {
  const supabase = await createClient();
  const primary = await supabase
    .from("brand_campaigns")
    .select(`${CAMPAIGN_SELECT}, sponsors(${SPONSOR_SELECT})`)
    .order("created_at", { ascending: false });

  let rows = primary.data as CampaignRow[] | null;
  let queryError = primary.error;

  if (queryError && isMissingSchemaError(queryError)) {
    const legacy = await supabase
      .from("brand_campaigns")
      .select(`${LEGACY_CAMPAIGN_SELECT}, sponsors(${LEGACY_SPONSOR_SELECT})`)
      .order("created_at", { ascending: false });
    rows = legacy.data as CampaignRow[] | null;
    queryError = legacy.error;
  }

  if (queryError) {
    return { data: [] as CampaignWithSponsor[], error: queryError.message };
  }

  return {
    data: ((rows ?? []) as CampaignRow[]).map((row) => ({
      ...mapCampaign(row),
      sponsor: firstRelation(row.sponsors)
        ? mapSponsor(firstRelation(row.sponsors) as SponsorRow)
        : null
    })),
    error: null
  };
}

export async function createCampaign(input: CampaignFormInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_campaigns")
    .insert(campaignInsertPayload(input))
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể tạo campaign." };
  }

  return { data: mapCampaign(data as CampaignRow), error: null };
}

export async function updateCampaignFull(input: CampaignFormInput & { campaignId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_campaigns")
    .update(campaignInsertPayload(input))
    .eq("id", input.campaignId)
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể cập nhật campaign." };
  }

  return { data: mapCampaign(data as CampaignRow), error: null };
}

export async function updateCampaignStatus(input: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_campaigns")
    .update({ status: input.status })
    .eq("id", input.campaignId)
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể cập nhật trạng thái campaign." };
  }

  return { data: mapCampaign(data as CampaignRow), error: null };
}

/** @deprecated Use updateCampaignFull — kept for backward compatibility */
export async function updateCampaign(input: {
  campaignId: string;
  status?: CampaignStatus;
  budgetVnd?: number | null;
  revenueVnd?: number | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const supabase = await createClient();
  const updates: Record<string, unknown> = {};

  if (input.status) updates.status = input.status;
  if (input.budgetVnd !== undefined) updates.budget_vnd = input.budgetVnd;
  if (input.revenueVnd !== undefined) updates.revenue_vnd = input.revenueVnd;
  if (input.ctaText !== undefined) updates.cta_text = input.ctaText?.trim() || null;
  if (input.ctaUrl !== undefined) updates.cta_url = input.ctaUrl?.trim() || null;
  if (input.startsAt !== undefined) updates.starts_at = input.startsAt || null;
  if (input.endsAt !== undefined) updates.ends_at = input.endsAt || null;

  const { data, error } = await supabase
    .from("brand_campaigns")
    .update(updates)
    .eq("id", input.campaignId)
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể cập nhật campaign." };
  }

  return { data: mapCampaign(data as CampaignRow), error: null };
}

export async function linkCampaignToChallenge(input: {
  campaignId: string | null;
  challengeId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("creator_challenges")
    .update({ sponsored_campaign_id: input.campaignId })
    .eq("id", input.challengeId);

  return { error: error?.message ?? null };
}

export async function getChallengeCampaignMap(challengeIds: string[]) {
  if (challengeIds.length === 0) {
    return new Map<string, CampaignWithSponsor>();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("creator_challenges")
    .select(
      `id, sponsored_campaign_id, brand_campaigns(${CAMPAIGN_SELECT}, sponsors(${SPONSOR_SELECT}))`
    )
    .in("id", challengeIds)
    .not("sponsored_campaign_id", "is", null);

  const map = new Map<string, CampaignWithSponsor>();
  for (const row of (data ?? []) as Array<{
    id: string;
    sponsored_campaign_id: string | null;
    brand_campaigns: CampaignRow | CampaignRow[] | null;
  }>) {
    const campaign = firstRelation(row.brand_campaigns);
    if (!campaign) continue;
    map.set(row.id, {
      ...mapCampaign(campaign),
      sponsor: firstRelation(campaign.sponsors)
        ? mapSponsor(firstRelation(campaign.sponsors) as SponsorRow)
        : null
    });
  }

  return map;
}

export async function getCampaignCenterSettings(): Promise<{
  data: CampaignCenterSettings;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_settings")
    .select("settings")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return { data: DEFAULT_CAMPAIGN_CENTER_SETTINGS, error: null };
    }
    return { data: DEFAULT_CAMPAIGN_CENTER_SETTINGS, error: error.message };
  }

  const raw = (data?.settings ?? {}) as Partial<CampaignCenterSettings>;
  return {
    data: { ...DEFAULT_CAMPAIGN_CENTER_SETTINGS, ...raw },
    error: null
  };
}

export async function saveCampaignCenterSettings(settings: CampaignCenterSettings) {
  const supabase = await createClient();
  const { error } = await supabase.from("campaign_settings").upsert({
    id: 1,
    settings,
    updated_at: new Date().toISOString()
  });

  if (error) {
    if (isMissingSchemaError(error)) {
      return { error: "Bảng campaign_settings chưa có — cần chạy migration 109." };
    }
    return { error: error.message };
  }

  return { error: null };
}

export async function getCampaignMetricsSummary(): Promise<{
  data: CampaignMetricsSummary;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_metrics")
    .select("impressions, clicks, joins");

  if (error) {
    if (isMissingSchemaError(error)) {
      return {
        data: {
          totalImpressions: 0,
          totalClicks: 0,
          totalJoins: 0,
          hasTrackingData: false
        },
        error: null
      };
    }
    return {
      data: {
        totalImpressions: 0,
        totalClicks: 0,
        totalJoins: 0,
        hasTrackingData: false
      },
      error: error.message
    };
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return {
      data: {
        totalImpressions: 0,
        totalClicks: 0,
        totalJoins: 0,
        hasTrackingData: false
      },
      error: null
    };
  }

  return {
    data: {
      totalImpressions: rows.reduce((s, r) => s + Number(r.impressions ?? 0), 0),
      totalClicks: rows.reduce((s, r) => s + Number(r.clicks ?? 0), 0),
      totalJoins: rows.reduce((s, r) => s + Number(r.joins ?? 0), 0),
      hasTrackingData: true
    },
    error: null
  };
}

export async function listActiveCampaignsForPlacement(
  placement: CampaignPlacement,
  campaignType?: CampaignType,
  settings?: CampaignCenterSettings | null
): Promise<CampaignWithSponsor[]> {
  const resolvedSettings = settings ?? (await getCampaignCenterSettings()).data;
  const now = Date.now();
  const supabase = await createClient();

  let query = supabase
    .from("brand_campaigns")
    .select(`${CAMPAIGN_SELECT}, sponsors(${SPONSOR_SELECT})`)
    .in("status", ["active", "scheduled"])
    .order("updated_at", { ascending: false })
    .limit(20);

  if (campaignType) {
    query = query.eq("campaign_type", campaignType);
  }

  const primary = await query;

  let rows = primary.data as CampaignRow[] | null;
  let queryError = primary.error;

  if (queryError && isMissingSchemaError(queryError)) {
    let legacyQuery = supabase
      .from("brand_campaigns")
      .select(`${LEGACY_CAMPAIGN_SELECT}, sponsors(${LEGACY_SPONSOR_SELECT})`)
      .in("status", ["active", "scheduled"])
      .order("updated_at", { ascending: false })
      .limit(20);
    if (campaignType) {
      legacyQuery = legacyQuery.eq("campaign_type", campaignType);
    }
    const legacy = await legacyQuery;
    rows = legacy.data as CampaignRow[] | null;
    queryError = legacy.error;
  }

  if (queryError || !rows?.length) {
    return [];
  }

  const matches: CampaignWithSponsor[] = [];

  for (const row of rows as CampaignRow[]) {
    const campaign: CampaignWithSponsor = {
      ...mapCampaign(row),
      sponsor: firstRelation(row.sponsors)
        ? mapSponsor(firstRelation(row.sponsors) as SponsorRow)
        : null
    };

    const resolvedPlacement =
      campaign.placement ?? getDefaultPlacementForType(campaign.campaignType);
    if (resolvedPlacement !== placement) continue;
    if (!isCampaignPubliclyVisible(campaign, resolvedSettings)) continue;

    const startsAt = campaign.startsAt ? new Date(campaign.startsAt).getTime() : null;
    const endsAt = campaign.endsAt ? new Date(campaign.endsAt).getTime() : null;
    if (startsAt !== null && now < startsAt) continue;
    if (endsAt !== null && now > endsAt) continue;

    matches.push(campaign);
  }

  return matches;
}

export async function getPublicCampaignForContent(input: {
  placement: CampaignPlacement;
  campaignType?: CampaignType;
  settings?: CampaignCenterSettings | null;
  matches?: (campaign: CampaignWithSponsor) => boolean;
}) {
  const campaigns = await listActiveCampaignsForPlacement(
    input.placement,
    input.campaignType,
    input.settings
  );

  if (input.matches) {
    return campaigns.find(input.matches) ?? null;
  }

  return campaigns[0] ?? null;
}

export async function getActiveCampaignForPlacement(
  placement: CampaignPlacement,
  campaignType?: CampaignType,
  settings?: CampaignCenterSettings | null
) {
  return getPublicCampaignForContent({ placement, campaignType, settings });
}

export async function getActiveCampaignByType(
  campaignType: CampaignType,
  settings?: CampaignCenterSettings | null
) {
  const resolvedSettings = settings ?? (await getCampaignCenterSettings()).data;
  const now = Date.now();
  const supabase = await createClient();

  const primary = await supabase
    .from("brand_campaigns")
    .select(`${CAMPAIGN_SELECT}, sponsors(${SPONSOR_SELECT})`)
    .eq("campaign_type", campaignType)
    .in("status", ["active", "scheduled"])
    .order("updated_at", { ascending: false })
    .limit(20);

  let rows = primary.data as CampaignRow[] | null;
  let queryError = primary.error;

  if (queryError && isMissingSchemaError(queryError)) {
    const legacy = await supabase
      .from("brand_campaigns")
      .select(`${LEGACY_CAMPAIGN_SELECT}, sponsors(${LEGACY_SPONSOR_SELECT})`)
      .eq("campaign_type", campaignType)
      .in("status", ["active", "scheduled"])
      .order("updated_at", { ascending: false })
      .limit(20);
    rows = legacy.data as CampaignRow[] | null;
    queryError = legacy.error;
  }

  if (queryError || !rows || rows.length === 0) {
    return null;
  }

  for (const row of rows as CampaignRow[]) {
    const campaign: CampaignWithSponsor = {
      ...mapCampaign(row),
      sponsor: firstRelation(row.sponsors)
        ? mapSponsor(firstRelation(row.sponsors) as SponsorRow)
        : null
    };

    if (!isCampaignPubliclyVisible(campaign, resolvedSettings)) continue;

    const startsAt = campaign.startsAt ? new Date(campaign.startsAt).getTime() : null;
    const endsAt = campaign.endsAt ? new Date(campaign.endsAt).getTime() : null;
    if (startsAt !== null && now < startsAt) continue;
    if (endsAt !== null && now > endsAt) continue;

    return campaign;
  }

  return null;
}
