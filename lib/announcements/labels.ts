import type {
  AnnouncementAudienceType,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementVisibility
} from "@/types/platform-content";

export const ANNOUNCEMENT_VISIBILITY_UI: Record<
  AnnouncementVisibility,
  { label: string; description: string }
> = {
  public: { label: "Public", description: "Trang công khai /thong-bao/..." },
  targeted: { label: "In-app", description: "Chỉ hiển thị trong app" },
  admin_only: { label: "Nội bộ", description: "Chỉ admin xem" }
};

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudienceType, string> = {
  all: "Tất cả người dùng",
  creators: "Chỉ tác giả",
  readers: "Chỉ độc giả",
  monetized_creators: "Đã bật kiếm tiền",
  published_creators: "Có truyện đang đăng",
  custom: "Tùy chọn (sau này)"
};

export const ANNOUNCEMENT_TYPE_COLORS: Record<AnnouncementType, string> = {
  general: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  maintenance: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  policy: "border-violet-400/30 bg-violet-400/10 text-violet-100",
  monetization: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  creator: "border-indigo-400/30 bg-indigo-400/10 text-indigo-100",
  reader: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  feature: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  warning: "border-orange-400/30 bg-orange-400/10 text-orange-100"
};

export const ANNOUNCEMENT_STATUS_COLORS: Record<AnnouncementStatus, string> = {
  published: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  hidden: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  archived: "border-zinc-600/30 bg-zinc-800/60 text-zinc-400"
};

export const ANNOUNCEMENT_PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  critical: "border-red-500/40 bg-red-500/15 text-red-100",
  high: "border-orange-400/40 bg-orange-400/15 text-orange-100",
  normal: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  low: "border-zinc-600/20 bg-zinc-800/40 text-zinc-500"
};

export type AnnouncementSeoIssue =
  | "missing_seo_title"
  | "missing_seo_description"
  | "invalid_canonical"
  | "indexable_no_body";

export function getAnnouncementSeoIssues(item: {
  indexable: boolean;
  seo_title: string | null;
  seo_description: string | null;
  canonical_path: string | null;
  body: string | null;
  slug: string;
}): AnnouncementSeoIssue[] {
  const issues: AnnouncementSeoIssue[] = [];

  if (!item.indexable) {
    return issues;
  }

  if (!item.seo_title?.trim()) {
    issues.push("missing_seo_title");
  }

  if (!item.seo_description?.trim()) {
    issues.push("missing_seo_description");
  }

  const canonical = item.canonical_path?.trim();
  if (canonical && !canonical.startsWith("/")) {
    issues.push("invalid_canonical");
  }

  if (!item.body?.trim()) {
    issues.push("indexable_no_body");
  }

  return issues;
}

export function hasAnnouncementSeoIssues(item: Parameters<typeof getAnnouncementSeoIssues>[0]) {
  return getAnnouncementSeoIssues(item).length > 0;
}
