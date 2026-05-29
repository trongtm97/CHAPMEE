import { createClient } from "@/lib/supabase/server";

export type ReportStatus = "pending" | "reviewing" | "resolved" | "rejected";

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
  const supabase = await createClient();

  if (targetType === "story") {
    const { data } = await supabase
      .from("stories")
      .select("slug")
      .eq("id", targetId)
      .maybeSingle();

    return data?.slug ? `/stories/${data.slug}` : null;
  }

  if (targetType === "episode") {
    const { data } = await supabase
      .from("episodes")
      .select("episode_number, stories(slug)")
      .eq("id", targetId)
      .maybeSingle();
    const story = firstRelation(data?.stories);

    return story?.slug
      ? `/stories/${story.slug}/episodes/${data?.episode_number}`
      : null;
  }

  if (targetType === "comment") {
    const { data } = await supabase
      .from("comments")
      .select("story_id, episode_id, stories(slug), episodes(episode_number, stories(slug))")
      .eq("id", targetId)
      .maybeSingle();
    const story = firstRelation(data?.stories);
    const episode = firstRelation(data?.episodes);
    const episodeStory = firstRelation(episode?.stories);

    if (episode?.episode_number && episodeStory?.slug) {
      return `/stories/${episodeStory.slug}/episodes/${episode.episode_number}`;
    }

    return story?.slug ? `/stories/${story.slug}` : null;
  }

  return null;
}

export async function getReports(status?: string): Promise<AdminReportsData> {
  const activeStatus = getReportStatusFilter(status);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
