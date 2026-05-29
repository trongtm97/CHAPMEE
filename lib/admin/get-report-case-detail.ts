"use server";

import { caseKey, getTargetTitle, resolveReportedUserId } from "@/lib/admin/get-report-page-data";
import { normalizeTargetType } from "@/lib/admin/report-labels";
import { createClient } from "@/lib/supabase/server";
import type { ReportCaseDetail, ReportCaseQueueItem } from "@/types/reports";

function firstRelation<T>(relation: unknown): T | null {
  if (relation == null) return null;
  return Array.isArray(relation) ? ((relation[0] as T) ?? null) : (relation as T);
}

async function getTargetBody(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetId: string
) {
  const type = normalizeTargetType(targetType);

  if (type === "story") {
    const { data } = await supabase
      .from("stories")
      .select("hook, short_description, long_description")
      .eq("id", targetId)
      .maybeSingle();
    return (
      (data?.hook as string) ??
      (data?.short_description as string) ??
      (data?.long_description as string)?.slice(0, 500) ??
      null
    );
  }
  if (type === "chapter") {
    const { data } = await supabase
      .from("episodes")
      .select("excerpt, content")
      .eq("id", targetId)
      .maybeSingle();
    const content = (data?.content as string) ?? "";
    return content.slice(0, 800) || (data?.excerpt as string) || null;
  }
  if (type === "comment") {
    const { data } = await supabase.from("comments").select("content").eq("id", targetId).maybeSingle();
    return (data?.content as string) ?? null;
  }
  if (type === "community_post") {
    const { data } = await supabase
      .from("community_posts")
      .select("content")
      .eq("id", targetId)
      .maybeSingle();
    return (data?.content as string)?.slice(0, 800) ?? null;
  }
  return null;
}

async function getTargetHref(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetId: string
) {
  const type = normalizeTargetType(targetType);
  if (type === "story") {
    const { data } = await supabase.from("stories").select("slug").eq("id", targetId).maybeSingle();
    return data?.slug ? `/stories/${data.slug}` : null;
  }
  if (type === "chapter") {
    const { data } = await supabase
      .from("episodes")
      .select("episode_number, stories(slug)")
      .eq("id", targetId)
      .maybeSingle();
    const story = firstRelation<{ slug: string | null }>(data?.stories);
    return story?.slug && data?.episode_number
      ? `/stories/${story.slug}/episodes/${data.episode_number}`
      : null;
  }
  return null;
}

export async function getReportCaseDetail(
  item: ReportCaseQueueItem
): Promise<{ detail: ReportCaseDetail | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const key = caseKey(item.targetType, item.targetId);

    const { data: reportRows, error } = await supabase
      .from("reports")
      .select(
        "id, reason, reason_code, reason_detail, details, created_at, reporter_id, profiles:reporter_id(display_name, username)"
      )
      .eq("target_type", item.targetType === "chapter" ? "chapter" : item.targetType)
      .eq("target_id", item.targetId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      const altType = item.targetType === "chapter" ? "episode" : item.targetType;
      const retry = await supabase
        .from("reports")
        .select(
          "id, reason, reason_code, reason_detail, details, created_at, reporter_id, profiles:reporter_id(display_name, username)"
        )
        .eq("target_type", altType)
        .eq("target_id", item.targetId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (retry.error) return { detail: null, error: retry.error.message };
    }

    const rows = reportRows ?? [];
    const reports = rows.map((row) => {
      const profile = firstRelation<{ display_name: string | null; username: string | null }>(
        row.profiles
      );
      return {
        id: row.id as string,
        reporterName: profile?.display_name ?? profile?.username ?? null,
        reasonCode: (row.reason_code as string) ?? (row.reason as string),
        reasonText: (row.reason_detail as string) ?? (row.details as string) ?? null,
        createdAt: row.created_at as string
      };
    });

    const reportedUserId = await resolveReportedUserId(
      supabase,
      item.targetType,
      item.targetId
    );

    let reportedUserName = item.reportedUserName;
    if (reportedUserId && !reportedUserName) {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", reportedUserId)
        .maybeSingle();
      reportedUserName =
        (data?.display_name as string) ?? (data?.username as string) ?? null;
    }

    const { count: targetReportHistory } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("target_id", item.targetId);

    let userReportHistory = 0;
    if (reportedUserId) {
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("reported_user_id", reportedUserId);
      userReportHistory = count ?? 0;
    }

    const title = await getTargetTitle(supabase, item.targetType, item.targetId);

    return {
      detail: {
        case: { ...item, title, caseKey: key },
        targetPreview: title,
        targetBody: await getTargetBody(supabase, item.targetType, item.targetId),
        targetHref: await getTargetHref(supabase, item.targetType, item.targetId),
        reportedUserName,
        assignedToName: item.assignedToName,
        reports,
        targetReportHistory: targetReportHistory ?? reports.length,
        userReportHistory
      },
      error: null
    };
  } catch (err) {
    return {
      detail: null,
      error: err instanceof Error ? err.message : "Không tải được chi tiết."
    };
  }
}
