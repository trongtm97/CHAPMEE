import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_TYPE_COLORS
} from "@/lib/announcements/labels";
import type {
  AnnouncementAudienceType,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementVisibility
} from "@/types/platform-content";

const STATUS_STYLES: Record<AnnouncementStatus, string> = {
  published: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  hidden: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  archived: "border-zinc-600/30 bg-zinc-800/60 text-zinc-400"
};

const STATUS_LABELS: Record<AnnouncementStatus, string> = {
  published: "Đã đăng",
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  hidden: "Đã ẩn",
  archived: "Archived"
};

const PRIORITY_STYLES: Record<AnnouncementPriority, string> = {
  critical: "border-red-500/40 bg-red-500/15 text-red-100 ring-1 ring-red-500/30",
  high: "border-orange-400/40 bg-orange-400/15 text-orange-100",
  normal: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  low: "border-zinc-600/20 bg-zinc-800/40 text-zinc-500"
};

const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low"
};

const VISIBILITY_LABELS: Record<AnnouncementVisibility, string> = {
  public: "Public",
  targeted: "In-app",
  admin_only: "Nội bộ"
};

const TYPE_LABELS: Record<AnnouncementType, string> = {
  general: "General",
  maintenance: "Maintenance",
  policy: "Policy",
  monetization: "Monetization",
  creator: "Creator",
  reader: "Reader",
  feature: "Feature",
  warning: "Warning"
};

export function AnnouncementStatusBadge({ status }: { status: AnnouncementStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function AnnouncementPriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function AnnouncementVisibilityBadge({
  visibility
}: {
  visibility: AnnouncementVisibility;
}) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
      {VISIBILITY_LABELS[visibility]}
    </span>
  );
}

export function AnnouncementTypeBadge({ type }: { type: AnnouncementType }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${ANNOUNCEMENT_TYPE_COLORS[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

export function AnnouncementAudienceBadge({
  audience
}: {
  audience: AnnouncementAudienceType;
}) {
  return (
    <span className="inline-flex max-w-[140px] truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
      {ANNOUNCEMENT_AUDIENCE_LABELS[audience]}
    </span>
  );
}

export function AnnouncementSeoBadge({
  indexable,
  hasIssues
}: {
  indexable: boolean;
  hasIssues?: boolean;
}) {
  if (!indexable) {
    return (
      <span className="inline-flex rounded-full border border-zinc-600/30 bg-zinc-800/50 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
        Noindex
      </span>
    );
  }

  if (hasIssues) {
    return (
      <span className="inline-flex rounded-full border border-orange-400/30 bg-orange-400/10 px-2.5 py-0.5 text-xs font-medium text-orange-100">
        SEO thiếu
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-100">
      Index
    </span>
  );
}

export function formatAnnouncementDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function getAnnouncementAccentClass(
  item: { priority: AnnouncementPriority; announcement_type: AnnouncementType; status: AnnouncementStatus }
) {
  if (item.priority === "critical") {
    return "border-l-4 border-l-red-500 bg-red-500/5";
  }

  if (item.priority === "high") {
    return "border-l-4 border-l-orange-400 bg-orange-400/5";
  }

  if (item.announcement_type === "warning" || item.announcement_type === "maintenance") {
    return "border-l-4 border-l-amber-400/80 bg-amber-400/5";
  }

  if (item.status === "archived" || item.status === "hidden") {
    return "opacity-80";
  }

  return "";
}

export { TYPE_LABELS as ANNOUNCEMENT_TYPE_LABELS };
