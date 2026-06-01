"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logCreatorAdPolicyAudit } from "@/lib/creator-ad-revenue/audit";
import { getCreatorAdRevenuePolicy, updateCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy";
import type { CreatorAdPolicyVersion } from "@/types/creator-ad-policy-version";
import type { CreatorAdRevenuePolicy } from "@/types/creator-ad-revenue-policy";

function mapVersion(row: Record<string, unknown>): CreatorAdPolicyVersion {
  return {
    id: String(row.id),
    version: String(row.version),
    status: row.status as CreatorAdPolicyVersion["status"],
    title: String(row.title ?? "Chính sách chia sẻ doanh thu quảng cáo"),
    body_markdown: String(row.body_markdown ?? ""),
    effective_at: (row.effective_at as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function listCreatorAdPolicyVersions(limit = 20): Promise<{
  versions: CreatorAdPolicyVersion[];
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("creator_ad_policy_versions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { versions: [], error: error.message };
    return {
      versions: (data ?? []).map((r) => mapVersion(r as Record<string, unknown>)),
      error: null
    };
  } catch {
    return { versions: [], error: "Không tải được phiên bản chính sách." };
  }
}

export async function saveCreatorAdPolicyDraftVersion(input: {
  policy: CreatorAdRevenuePolicy;
  actorId: string;
  title?: string;
}): Promise<{ version: CreatorAdPolicyVersion | null; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("creator_ad_policy_versions")
      .insert({
        version: input.policy.policy_version,
        status: "draft",
        title: input.title ?? "Chính sách chia sẻ doanh thu quảng cáo",
        body_markdown: input.policy.policy_text ?? "",
        effective_at: input.policy.policy_effective_at,
        created_by: input.actorId
      })
      .select("*")
      .single();

    if (error) return { version: null, error: error.message };

    const version = mapVersion(data as Record<string, unknown>);
    await logCreatorAdPolicyAudit({
      actorId: input.actorId,
      action: "policy_version_draft_saved",
      before: null,
      after: version as unknown as Record<string, unknown>,
      note: `Phiên bản ${version.version}`
    });
    return { version, error: null };
  } catch {
    return { version: null, error: "Không lưu bản nháp phiên bản." };
  }
}

export async function publishCreatorAdPolicyVersion(input: {
  policy: CreatorAdRevenuePolicy;
  actorId: string;
  effectiveAt?: string | null;
}): Promise<{ version: CreatorAdPolicyVersion | null; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    await supabase
      .from("creator_ad_policy_versions")
      .update({ status: "archived" })
      .eq("status", "published");

    const { data, error } = await supabase
      .from("creator_ad_policy_versions")
      .insert({
        version: input.policy.policy_version,
        status: "published",
        title: "Chính sách chia sẻ doanh thu quảng cáo",
        body_markdown: input.policy.policy_text ?? "",
        effective_at: input.effectiveAt ?? now,
        published_at: now,
        created_by: input.actorId
      })
      .select("*")
      .single();

    if (error) return { version: null, error: error.message };

    const version = mapVersion(data as Record<string, unknown>);
    await logCreatorAdPolicyAudit({
      actorId: input.actorId,
      action: "policy_version_published",
      before: null,
      after: version as unknown as Record<string, unknown>,
      note: `Xuất bản v${version.version}`
    });
    return { version, error: null };
  } catch {
    return { version: null, error: "Không xuất bản phiên bản chính sách." };
  }
}

export async function restoreCreatorAdPolicyVersion(
  versionId: string,
  actorId: string
): Promise<{ policy: CreatorAdRevenuePolicy | null; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const { data: row, error: loadError } = await supabase
      .from("creator_ad_policy_versions")
      .select("*")
      .eq("id", versionId)
      .maybeSingle();

    if (loadError || !row) {
      return { policy: null, error: loadError?.message ?? "Không tìm thấy phiên bản." };
    }

    const version = mapVersion(row as Record<string, unknown>);
    const result = await updateCreatorAdRevenuePolicy(
      {
        policy_text: version.body_markdown,
        policy_version: version.version,
        policy_status: "draft"
      },
      actorId,
      { auditNote: `Khôi phục từ phiên bản ${version.version}` }
    );

    if (result.error) return { policy: null, error: result.error };

    await logCreatorAdPolicyAudit({
      actorId,
      action: "policy_version_restored",
      before: null,
      after: { version_id: versionId },
      note: version.version
    });

    return { policy: result.policy, error: null };
  } catch {
    return { policy: null, error: "Không khôi phục được phiên bản." };
  }
}
