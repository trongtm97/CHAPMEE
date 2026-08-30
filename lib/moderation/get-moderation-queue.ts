"use server";

import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { getReporterQuality } from "@/lib/moderation/reporter-quality";
import type {
  AppealStatus,
  ReportPriority,
  ReportReasonCode,
  ReportStatus,
  ReportTargetType,
  ReporterQualitySummary
} from "@/types/moderation";

export type ModerationReportRow = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: ReportReasonCode;
  reasonDetail: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  reporterId: string;
  reporterName: string | null;
  reportedUserId: string | null;
  createdAt: string;
  preview: string | null;
  metadata: Record<string, unknown>;
  reporterQuality: ReporterQualitySummary | null;
};

export type ModerationAppealRow = {
  id: string;
  userId: string;
  userName: string | null;
  violationId: string;
  message: string;
  status: AppealStatus;
  createdAt: string;
};

export async function getModerationReports(
  statusFilter?: ReportStatus | "all"
): Promise<ModerationReportRow[]> {
  const db = await createClient();
  let query = db
    .from("reports")
    .select(
      `
      id,
      target_type,
      target_id,
      reason,
      reason_code,
      reason_detail,
      details,
      status,
      priority,
      reporter_id,
      metadata,
      created_at,
      profiles:reporter_id ( display_name, username )
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "pending") {
      query = query.in("status", ["pending", "open"]);
    } else {
      query = query.eq("status", statusFilter);
    }
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw new Error(error.message);
  }

  const rows: ModerationReportRow[] = [];

  for (const row of data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const preview = await getTargetPreview(
      db,
      row.target_type,
      row.target_id
    );
    const reportedUserId = await resolveReportedUserId(
      db,
      row.target_type,
      row.target_id
    );

    const reporterQuality = await getReporterQuality(row.reporter_id);

    rows.push({
      id: row.id,
      targetType: row.target_type as ReportTargetType,
      targetId: row.target_id,
      reasonCode: (row.reason_code ?? row.reason) as ReportReasonCode,
      reasonDetail: row.reason_detail ?? row.details,
      status: row.status as ReportStatus,
      priority: (row.priority ?? "normal") as ReportPriority,
      reporterId: row.reporter_id,
      reporterName:
        profile?.display_name ?? profile?.username ?? null,
      reportedUserId,
      createdAt: row.created_at,
      preview,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      reporterQuality
    });
  }

  return rows;
}

export async function getModerationAppeals(): Promise<ModerationAppealRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("moderation_appeals")
    .select(
      `
      id,
      user_id,
      violation_id,
      message,
      status,
      created_at,
      profiles:user_id ( display_name, username )
    `
    )
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    return [];
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      userId: row.user_id,
      userName: profile?.display_name ?? profile?.username ?? null,
      violationId: row.violation_id,
      message: row.message,
      status: row.status as AppealStatus,
      createdAt: row.created_at
    };
  });
}

async function getTargetPreview(
  db: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetId: string
): Promise<string | null> {
  if (targetType === "story") {
    const { data } = await db
      .from("stories")
      .select("title")
      .eq("id", targetId)
      .maybeSingle();
    return data?.title ?? null;
  }
  if (targetType === "chapter") {
    const { data } = await db
      .from("episodes")
      .select("title")
      .eq("id", targetId)
      .maybeSingle();
    return data?.title ?? null;
  }
  if (targetType === "comment") {
    const { data } = await db
      .from("comments")
      .select("content")
      .eq("id", targetId)
      .maybeSingle();
    return data?.content?.slice(0, 120) ?? null;
  }
  if (targetType === "community_post") {
    const { data } = await db
      .from("community_posts")
      .select("title, content")
      .eq("id", targetId)
      .maybeSingle();
    return data?.title ?? data?.content?.slice(0, 120) ?? null;
  }
  if (targetType === "user" || targetType === "creator") {
    const { data } = await db
      .from("profiles")
      .select("display_name, username")
      .eq("id", targetId)
      .maybeSingle();
    return data?.display_name ?? data?.username ?? null;
  }
  return null;
}

async function resolveReportedUserId(
  db: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetId: string
): Promise<string | null> {
  if (targetType === "user") {
    return targetId;
  }
  if (targetType === "creator") {
    const { data } = await db
      .from("creator_profiles")
      .select("user_id")
      .eq("id", targetId)
      .maybeSingle();
    return data?.user_id ?? null;
  }
  if (targetType === "comment") {
    const { data } = await db
      .from("comments")
      .select("user_id")
      .eq("id", targetId)
      .maybeSingle();
    return data?.user_id ?? null;
  }
  if (targetType === "community_post") {
    const { data } = await db
      .from("community_posts")
      .select("user_id")
      .eq("id", targetId)
      .maybeSingle();
    return data?.user_id ?? null;
  }
  if (targetType === "story") {
    const { data } = await db
      .from("stories")
      .select("creator_profiles!inner(user_id)")
      .eq("id", targetId)
      .maybeSingle();
    const cp = data?.creator_profiles as { user_id: string } | { user_id: string }[] | null;
    if (Array.isArray(cp)) return cp[0]?.user_id ?? null;
    return cp?.user_id ?? null;
  }
  if (targetType === "chapter") {
    const { data } = await db
      .from("episodes")
      .select("stories!inner(creator_profiles!inner(user_id))")
      .eq("id", targetId)
      .maybeSingle();
    const stories = data?.stories as unknown as {
      creator_profiles: { user_id: string } | { user_id: string }[];
    } | null;
    const cp = stories?.creator_profiles;
    if (Array.isArray(cp)) return cp[0]?.user_id ?? null;
    return cp?.user_id ?? null;
  }
  return null;
}
