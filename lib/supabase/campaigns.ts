import { createClient } from "@/lib/supabase/server";
import type {
  BrandCampaignRecord,
  CampaignStatus,
  CampaignType,
  CampaignWithSponsor,
  SponsorRecord,
  SponsorStatus
} from "@/types/campaign";

type SponsorRow = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  status: SponsorStatus;
  created_at: string;
  updated_at: string;
};

type CampaignRow = {
  id: string;
  sponsor_id: string;
  name: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  budget_vnd: number | null;
  revenue_vnd: number | null;
  starts_at: string | null;
  ends_at: string | null;
  cta_text: string | null;
  cta_url: string | null;
  disclosure_text: string | null;
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
    status: row.status,
    budgetVnd: row.budget_vnd,
    revenueVnd: row.revenue_vnd,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    ctaText: row.cta_text,
    ctaUrl: row.cta_url,
    disclosureText: row.disclosure_text ?? "Được tài trợ",
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getSponsorsForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("id, name, logo_url, website_url, contact_email, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as SponsorRecord[], error: error.message };
  }

  return { data: ((data ?? []) as SponsorRow[]).map(mapSponsor), error: null };
}

export async function createSponsor(input: {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  status?: SponsorStatus;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .insert({
      name: input.name.trim(),
      logo_url: input.logoUrl?.trim() || null,
      website_url: input.websiteUrl?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
      status: input.status ?? "active"
    })
    .select("id, name, logo_url, website_url, contact_email, status, created_at, updated_at")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể tạo sponsor." };
  }

  return { data: mapSponsor(data as SponsorRow), error: null };
}

export async function getCampaignsForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_campaigns")
    .select(
      "id, sponsor_id, name, campaign_type, status, budget_vnd, revenue_vnd, starts_at, ends_at, cta_text, cta_url, disclosure_text, metadata, created_at, updated_at, sponsors(id, name, logo_url, website_url, contact_email, status, created_at, updated_at)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as CampaignWithSponsor[], error: error.message };
  }

  return {
    data: ((data ?? []) as CampaignRow[]).map((row) => ({
      ...mapCampaign(row),
      sponsor: firstRelation(row.sponsors)
        ? mapSponsor(firstRelation(row.sponsors) as SponsorRow)
        : null
    })),
    error: null
  };
}

export async function createCampaign(input: {
  sponsorId: string;
  name: string;
  campaignType: CampaignType;
  status?: CampaignStatus;
  budgetVnd?: number | null;
  revenueVnd?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  disclosureText?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_campaigns")
    .insert({
      sponsor_id: input.sponsorId,
      name: input.name.trim(),
      campaign_type: input.campaignType,
      status: input.status ?? "draft",
      budget_vnd: input.budgetVnd ?? null,
      revenue_vnd: input.revenueVnd ?? null,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
      cta_text: input.ctaText?.trim() || null,
      cta_url: input.ctaUrl?.trim() || null,
      disclosure_text: input.disclosureText?.trim() || "Được tài trợ"
    })
    .select("id, sponsor_id, name, campaign_type, status, budget_vnd, revenue_vnd, starts_at, ends_at, cta_text, cta_url, disclosure_text, metadata, created_at, updated_at")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không thể tạo campaign." };
  }

  return { data: mapCampaign(data as CampaignRow), error: null };
}

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
    .select("id, sponsor_id, name, campaign_type, status, budget_vnd, revenue_vnd, starts_at, ends_at, cta_text, cta_url, disclosure_text, metadata, created_at, updated_at")
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
      "id, sponsored_campaign_id, brand_campaigns(id, sponsor_id, name, campaign_type, status, budget_vnd, revenue_vnd, starts_at, ends_at, cta_text, cta_url, disclosure_text, metadata, created_at, updated_at, sponsors(id, name, logo_url, website_url, contact_email, status, created_at, updated_at))"
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

export async function getActiveCampaignByType(campaignType: CampaignType) {
  const now = Date.now();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_campaigns")
    .select(
      "id, sponsor_id, name, campaign_type, status, budget_vnd, revenue_vnd, starts_at, ends_at, cta_text, cta_url, disclosure_text, metadata, created_at, updated_at, sponsors(id, name, logo_url, website_url, contact_email, status, created_at, updated_at)"
    )
    .eq("campaign_type", campaignType)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    return null;
  }
  const row = (data as CampaignRow[]).find((item) => {
    const startsAt = item.starts_at ? new Date(item.starts_at).getTime() : null;
    const endsAt = item.ends_at ? new Date(item.ends_at).getTime() : null;
    return (!startsAt || now >= startsAt) && (!endsAt || now <= endsAt);
  });
  if (!row) return null;
  return {
    ...mapCampaign(row),
    sponsor: firstRelation(row.sponsors)
      ? mapSponsor(firstRelation(row.sponsors) as SponsorRow)
      : null
  } satisfies CampaignWithSponsor;
}
