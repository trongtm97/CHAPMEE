import { createClient } from "@/lib/supabase/server";

export type AdminDashboardStats = {
  pendingStories: number;
  pendingEpisodes: number;
  openReports: number;
  pendingCommunityPosts: number;
  recentModerationCases: number;
};

export type AdminDashboardData = {
  stats: AdminDashboardStats;
  error: string | null;
};

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  try {
    const supabase = await createClient();
    const [
      pendingStories,
      pendingEpisodes,
      openReports,
      pendingCommunityPosts,
      recentModerationCases
    ] = await Promise.all([
      supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "reviewing"]),
      supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("moderation_cases")
        .select("id", { count: "exact", head: true })
        .order("created_at", { ascending: false })
        .limit(10)
    ]);

    const error =
      pendingStories.error ??
      pendingEpisodes.error ??
      openReports.error ??
      pendingCommunityPosts.error ??
      recentModerationCases.error ??
      null;

    return {
      error: error?.message ?? null,
      stats: {
        pendingStories: pendingStories.count ?? 0,
        pendingEpisodes: pendingEpisodes.count ?? 0,
        openReports: openReports.count ?? 0,
        pendingCommunityPosts: pendingCommunityPosts.count ?? 0,
        recentModerationCases: recentModerationCases.count ?? 0
      }
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải dashboard admin.",
      stats: {
        pendingStories: 0,
        pendingEpisodes: 0,
        openReports: 0,
        pendingCommunityPosts: 0,
        recentModerationCases: 0
      }
    };
  }
}
