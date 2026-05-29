import { startOfTodayIso } from "@/lib/admin/messaging-date-range";
import {
  normalizeTargetType,
  priorityToSeverity,
  PENDING_STATUSES,
  REJECTED_STATUSES,
  reportReasonLabel,
  RESOLVED_STATUSES,
  REVIEWING_STATUSES
} from "@/lib/admin/report-labels";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type {
  RecentlyHandledReportItem,
  ReportCaseQueueItem,
  ReportPageData,
  ReportSeverity,
  ReportSummary
} from "@/types/reports";

const CONTENT_TARGET_TYPES = ["story", "chapter", "episode", "comment", "community_post"];

const REPORT_AUDIT_ACTIONS = [
  "report_assigned",
  "report_rejected",
  "report_resolved",
  "report_escalated",
  "reported_content_hidden",
  "reported_user_warned",
  "reported_user_restricted",
  "delete_report",
  "moderation_action"
];

type RawReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  reason_code: string | null;
  reason_detail: string | null;
  details: string | null;
  status: string;
  priority: string | null;
  assigned_to: string | null;
  moderation_case_id: string | null;
  reported_user_id: string | null;
  reporter_id: string;
  created_at: string;
  updated_at: string;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
};

function firstRelation<T>(relation: unknown): T | null {
  if (relation == null) return null;
  return Array.isArray(relation) ? ((relation[0] as T) ?? null) : (relation as T);
}

function caseKey(targetType: string, targetId: string) {
  return `${normalizeTargetType(targetType)}:${targetId}`;
}

function maxSeverity(current: ReportSeverity, next: ReportSeverity): ReportSeverity {
  const order: ReportSeverity[] = ["low", "medium", "high", "urgent"];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

function aggregateStatus(statuses: string[]) {
  if (statuses.some((s) => REVIEWING_STATUSES.includes(s as never))) return "reviewing";
  if (statuses.some((s) => PENDING_STATUSES.includes(s as never))) return "pending";
  if (statuses.some((s) => RESOLVED_STATUSES.includes(s as never))) return "resolved";
  if (statuses.some((s) => REJECTED_STATUSES.includes(s as never))) return "rejected";
  return statuses[0] ?? "pending";
}

async function getTargetTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetId: string
) {
  const type = normalizeTargetType(targetType);

  if (type === "story") {
    const { data } = await supabase.from("stories").select("title").eq("id", targetId).maybeSingle();
    return (data?.title as string) ?? targetId.slice(0, 8);
  }
  if (type === "chapter") {
    const { data } = await supabase.from("episodes").select("title").eq("id", targetId).maybeSingle();
    return (data?.title as string) ?? `Chương ${targetId.slice(0, 8)}`;
  }
  if (type === "comment") {
    const { data } = await supabase.from("comments").select("content").eq("id", targetId).maybeSingle();
    const body = (data?.content as string) ?? "";
    return body.slice(0, 80) || "Bình luận";
  }
  if (type === "community_post") {
    const { data } = await supabase
      .from("community_posts")
      .select("title, content")
      .eq("id", targetId)
      .maybeSingle();
    return ((data?.title as string) ?? (data?.content as string)?.slice(0, 80)) || "Bài cộng đồng";
  }
  if (type === "user" || type === "author_profile") {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", targetId)
      .maybeSingle();
    return (data?.display_name as string) ?? (data?.username as string) ?? "Tài khoản";
  }
  return targetId.slice(0, 12);
}

async function resolveReportedUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetId: string
) {
  const type = normalizeTargetType(targetType);
  if (type === "user" || type === "author_profile") return targetId;
  if (type === "comment") {
    const { data } = await supabase.from("comments").select("user_id").eq("id", targetId).maybeSingle();
    return (data?.user_id as string) ?? null;
  }
  if (type === "community_post") {
    const { data } = await supabase
      .from("community_posts")
      .select("user_id")
      .eq("id", targetId)
      .maybeSingle();
    return (data?.user_id as string) ?? null;
  }
  if (type === "story") {
    const { data } = await supabase
      .from("stories")
      .select("creator_profiles(user_id)")
      .eq("id", targetId)
      .maybeSingle();
    const cp = firstRelation<{ user_id: string }>(data?.creator_profiles);
    return cp?.user_id ?? null;
  }
  if (type === "chapter") {
    const { data } = await supabase
      .from("episodes")
      .select("stories(creator_profiles(user_id))")
      .eq("id", targetId)
      .maybeSingle();
    const story = firstRelation<{ creator_profiles: { user_id: string } | null }>(data?.stories);
    const cp = firstRelation<{ user_id: string }>(story?.creator_profiles);
    return cp?.user_id ?? null;
  }
  return null;
}

function buildCases(rows: RawReportRow[], profileNames: Map<string, string>): ReportCaseQueueItem[] {
  const groups = new Map<string, RawReportRow[]>();

  for (const row of rows) {
    const key = caseKey(row.target_type, row.target_id);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const cases: ReportCaseQueueItem[] = [];

  for (const [key, reports] of groups) {
    const sorted = [...reports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = sorted[0];
    const reporterIds = new Set(reports.map((r) => r.reporter_id));
    let severity: ReportSeverity = "medium";
    for (const r of reports) {
      severity = maxSeverity(severity, priorityToSeverity(r.priority));
    }

    const latestReporter = firstRelation<{
      display_name: string | null;
      username: string | null;
    }>(latest.profiles);

    cases.push({
      caseKey: key,
      moderationCaseId: latest.moderation_case_id ?? null,
      targetType: normalizeTargetType(latest.target_type),
      targetId: latest.target_id,
      title: "",
      primaryReasonCode: latest.reason_code ?? latest.reason,
      reportCount: reports.length,
      reporterCount: reporterIds.size,
      severity,
      reportedUserName: latest.reported_user_id
        ? (profileNames.get(latest.reported_user_id) ?? null)
        : null,
      latestReporterName:
        latestReporter?.display_name ?? latestReporter?.username ?? null,
      status: aggregateStatus(reports.map((r) => r.status)),
      assignedToName: latest.assigned_to
        ? (profileNames.get(latest.assigned_to) ?? null)
        : null,
      latestAt: latest.created_at,
      preview: latest.reason_detail ?? latest.details
    });
  }

  return cases.sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
  );
}

export async function getReportPageData(): Promise<ReportPageData> {
  const empty: ReportPageData = {
    summary: {
      pending: 0,
      reviewing: 0,
      highSeverity: 0,
      messageReports: 0,
      contentReports: 0,
      resolvedToday: 0
    },
    cases: [],
    recentlyHandled: [],
    canModerate: false,
    error: null
  };

  try {
    const supabase = await createClient();
    const todayStart = startOfTodayIso();

    const { data: perm } = await supabase.rpc("user_has_permission", {
      input_user_id: (await supabase.auth.getUser()).data.user?.id,
      permission_code: "report.review"
    });
    const canModerate = Boolean(perm);

    const selectCols =
      "id, target_type, target_id, reason, reason_code, reason_detail, details, status, priority, assigned_to, moderation_case_id, reported_user_id, reporter_id, created_at, updated_at, profiles:reporter_id(display_name, username)";

    const { data: reportRows, error: reportsError } = await supabase
      .from("reports")
      .select(selectCols)
      .order("created_at", { ascending: false })
      .limit(250);

    if (reportsError) {
      if (isMissingSchemaError(reportsError)) {
        const fallback = await supabase
          .from("reports")
          .select(
            "id, target_type, target_id, reason, details, status, reporter_id, created_at, updated_at, profiles:reporter_id(display_name, username)"
          )
          .order("created_at", { ascending: false })
          .limit(250);

        if (fallback.error) throw fallback.error;
        const rows = (fallback.data ?? []).map((r) => ({
          ...(r as Record<string, unknown>),
          reason_code: null,
          reason_detail: (r as { details?: string }).details ?? null,
          priority: "normal",
          assigned_to: null,
          moderation_case_id: null,
          reported_user_id: null
        })) as RawReportRow[];

        const cases = buildCases(rows, new Map());
        for (const c of cases) {
          c.title = await getTargetTitle(supabase, c.targetType, c.targetId);
        }

        return {
          ...empty,
          canModerate,
          cases,
          summary: buildSummary(rows, 0, 0)
        };
      }
      throw reportsError;
    }

    const rows = (reportRows ?? []) as unknown as RawReportRow[];

    let messageReports = 0;
    try {
      const { count } = await supabase
        .from("message_reports")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "open", "reviewing"]);
      messageReports = count ?? 0;
    } catch {
      messageReports = 0;
    }

    const profileIds = new Set<string>();
    for (const row of rows) {
      if (row.assigned_to) profileIds.add(row.assigned_to);
      if (row.reported_user_id) profileIds.add(row.reported_user_id);
    }

    const profileNames = new Map<string, string>();
    if (profileIds.size) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", [...profileIds]);
      for (const p of profiles ?? []) {
        profileNames.set(
          p.id as string,
          (p.display_name as string) ?? (p.username as string) ?? "—"
        );
      }
    }

    const cases = buildCases(rows, profileNames);
    for (const c of cases) {
      c.title = await getTargetTitle(supabase, c.targetType, c.targetId);
      if (!c.reportedUserName) {
        const uid = await resolveReportedUserId(supabase, c.targetType, c.targetId);
        if (uid) {
          if (!profileNames.has(uid)) {
            const { data } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", uid)
              .maybeSingle();
            profileNames.set(
              uid,
              (data?.display_name as string) ?? (data?.username as string) ?? "—"
            );
          }
          c.reportedUserName = profileNames.get(uid) ?? null;
        }
      }
    }

    const { data: auditToday } = await supabase
      .from("admin_audit_logs")
      .select("id")
      .gte("created_at", todayStart)
      .in("action", REPORT_AUDIT_ACTIONS);

    const { data: recentAudit } = await supabase
      .from("admin_audit_logs")
      .select("id, action, target_type, target_id, metadata, created_at, actor_id")
      .in("action", REPORT_AUDIT_ACTIONS)
      .order("created_at", { ascending: false })
      .limit(10);

    const actorIds = [
      ...new Set((recentAudit ?? []).map((r) => r.actor_id as string).filter(Boolean))
    ];
    const actorNames = new Map<string, string>();
    if (actorIds.length) {
      const { data: actors } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", actorIds);
      for (const a of actors ?? []) {
        actorNames.set(
          a.id as string,
          (a.display_name as string) ?? (a.username as string) ?? "Admin"
        );
      }
    }

    const recentlyHandled: RecentlyHandledReportItem[] = await Promise.all(
      (recentAudit ?? []).map(async (row) => {
        const meta = (row.metadata as Record<string, unknown>) ?? {};
        const targetType = normalizeTargetType((row.target_type as string) ?? "story");
        const targetId = (row.target_id as string) ?? "";
        let title = targetId.slice(0, 8);
        if (targetId) {
          title = await getTargetTitle(supabase, targetType, targetId);
        }

        const action = row.action as string;
        let actionLabel = "Đã xử lý";
        if (action.includes("reject")) actionLabel = "Từ chối";
        if (action.includes("assigned")) actionLabel = "Nhận xử lý";
        if (action.includes("hidden")) actionLabel = "Ẩn nội dung";
        if (action.includes("escalated")) actionLabel = "Chuyển cấp";
        if (action.includes("warned")) actionLabel = "Cảnh báo";

        return {
          id: row.id as string,
          title,
          targetType,
          actionLabel,
          moderatorName: row.actor_id
            ? (actorNames.get(row.actor_id as string) ?? null)
            : null,
          resolutionCode: (meta.resolution_code as string) ?? null,
          createdAt: row.created_at as string
        };
      })
    );

    return {
      summary: buildSummary(rows, messageReports, auditToday?.length ?? 0),
      cases,
      recentlyHandled,
      canModerate,
      error: null
    };
  } catch (error) {
    return {
      ...empty,
      error: "Không tải được báo cáo. Vui lòng thử lại."
    };
  }
}

function buildSummary(
  rows: RawReportRow[],
  messageReports: number,
  resolvedToday: number
): ReportSummary {
  const pending = rows.filter((r) =>
    PENDING_STATUSES.includes(r.status as (typeof PENDING_STATUSES)[number])
  ).length;
  const reviewing = rows.filter((r) =>
    REVIEWING_STATUSES.includes(r.status as (typeof REVIEWING_STATUSES)[number])
  ).length;
  const highSeverity = rows.filter((r) => {
    const sev = priorityToSeverity(r.priority);
    return (
      (sev === "high" || sev === "urgent") &&
      (PENDING_STATUSES.includes(r.status as never) ||
        REVIEWING_STATUSES.includes(r.status as never))
    );
  }).length;
  const contentReports = rows.filter((r) =>
    CONTENT_TARGET_TYPES.includes(normalizeTargetType(r.target_type))
  ).filter((r) =>
    PENDING_STATUSES.includes(r.status as never) ||
    REVIEWING_STATUSES.includes(r.status as never)
  ).length;

  return {
    pending,
    reviewing,
    highSeverity,
    messageReports,
    contentReports,
    resolvedToday
  };
}

export { caseKey, getTargetTitle, resolveReportedUserId };
