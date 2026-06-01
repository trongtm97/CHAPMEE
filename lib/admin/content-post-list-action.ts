"use server";

import {
  getContentPostStats,
  listContentPosts
} from "@/lib/platform-content/content-posts";
import type { ContentPostListFilters } from "@/lib/platform-content/parse-post-filters";

export async function listContentPostsForAdminAction(filters: ContentPostListFilters) {
  return listContentPosts(filters);
}

export async function getContentPostStatsForAdminAction() {
  return getContentPostStats();
}
