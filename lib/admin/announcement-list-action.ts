"use server";

import {
  getAnnouncementStats,
  listAnnouncements
} from "@/lib/platform-content/announcements";
import type { AnnouncementListFilters } from "@/lib/platform-content/parse-announcement-filters";

export async function listAnnouncementsForAdminAction(filters: AnnouncementListFilters) {
  return listAnnouncements(filters);
}

export async function getAnnouncementStatsForAdminAction() {
  return getAnnouncementStats();
}
