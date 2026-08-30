import { createClient } from "@/lib/data/server";
import { getChapterUrl, getStoryUrl } from "@/lib/urls/paths";

export type ReportStatus = "pending" | "reviewing" | "resolved" | "rejected";

/** Báo cáo chưa xử lý xong (`open` đã rename thành `pending` trong DB). */
export const OPEN_QUEUE_REPORT_STATUSES: ReportStatus[] = ["pending", "reviewing"];

/** @deprecated legacy alias */
export type LegacyReportStatus = "open" | ReportStatus;

export type AdminReport = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  reporterName: string | null;
  targetHref: string | null;
};

export type AdminReportsData = {
  reports: AdminReport[];
  activeStatus: ReportStatus;
  error: string | null;
};

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
};

const statuses: ReportStatus[] = ["pending", "reviewing", "resolved", "rejected"];

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export function getReportStatusFilter(status?: string): ReportStatus {
  if (status === "open") return "pending";
  return statuses.includes(status as ReportStatus)
    ? (status as ReportStatus)
    : "pending";
}

async function getTargetHref(targetType: string, targetId: string) {
  const db = await createClient();

  if (targetType === "story") {
    const { data } = await db
      .from("stories")
      .select("slug, public_code")
      .eq("id", targetId)
      .maybeSingle();

    return data?.slug && data.public_code
      ? getStoryUrl({ slug: data.slug, public_code: data.public_code })
      : null;
  }

  if (targetType === "episode") {
    const { data } = await db
      .from("episodes")
      .select("slug, public_code, episode_number, stories(slug, public_code)")
      .eq("id", targetId)
      .maybeSingle();
    const story = firstRelation(data?.stories);

    return story?.slug && story.public_code && data?.slug && data.public_code
      ? getChapterUrl(
          { slug: story.slug, public_code: story.public_code },
          { slug: data.slug, public_code: data.public_code }
        )
      : null;
  }

  if (targetType === "comment") {
    const { data } = await db
      .from("comments")
      .select(
        "story_id, episode_id, stories(slug, public_code), episodes(slug, public_code, episode_number, stories(slug, public_code))"
      )
      .eq("id", targetId)
      .maybeSingle();
    const story = firstRelation(data?.stories);
    const episode = firstRelation(data?.episodes);
    const episodeStory = firstRelation(episode?.stories);

    if (
      episode?.slug &&
      episode.public_code &&
      episodeStory?.slug &&
      episodeStory.public_code
    ) {
      return getChapterUrl(
        { slug: episodeStory.slug, public_code: episodeStory.public_code },
        { slug: episode.slug, public_code: episode.public_code }
      );
    }

    return story?.slug && story.public_code
      ? getStoryUrl({ slug: story.slug, public_code: story.public_code })
      : null;
  }

  return null;
}

export async function getReports(status?: string): Promise<AdminReportsData> {
  const activeStatus = getReportStatusFilter(status);

  try {
    const db = await createClient();
    const { data, error } = await db
      .from("reports")
      .select(
        "id, target_type, target_id, reason, details, status, created_at, updated_at, profiles(display_name, username)"
      )
      .eq("status", activeStatus)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as ReportRow[];
    const reports = await Promise.all(
      rows.map(async (report) => {
        const reporter = firstRelation(report.profiles);

        return {
          id: report.id,
          targetType: report.target_type,
          targetId: report.target_id,
          reason: report.reason,
          details: report.details,
          status: report.status,
          createdAt: report.created_at,
          updatedAt: report.updated_at,
          reporterName: reporter?.display_name ?? reporter?.username ?? null,
          targetHref: await getTargetHref(report.target_type, report.target_id)
        };
      })
    );

    return { activeStatus, error: null, reports };
  } catch (error) {
    return {
      activeStatus,
      error: error instanceof Error ? error.message : "Không thể tải reports.",
      reports: []
    };
  }
}
