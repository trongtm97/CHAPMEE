import type { ContentPostStatus } from "@/types/platform-content";
import { getSeoScoreLabel } from "@/lib/content-posts/seo-validation";

const STATUS_STYLES: Record<ContentPostStatus, string> = {
  published: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  hidden: "border-violet-400/30 bg-violet-400/10 text-violet-100",
  archived: "border-zinc-600/30 bg-zinc-800/60 text-zinc-400"
};

const STATUS_LABELS: Record<ContentPostStatus, string> = {
  published: "Đã đăng",
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  hidden: "Đã ẩn",
  archived: "Archived"
};

const TYPE_COLORS: Record<string, string> = {
  article: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  guide: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  seo: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  editorial: "border-indigo-400/30 bg-indigo-400/10 text-indigo-100",
  policy: "border-violet-400/30 bg-violet-400/10 text-violet-100",
  news: "border-amber-400/30 bg-amber-400/10 text-amber-100"
};

export function ContentPostStatusBadge({ status }: { status: ContentPostStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ContentPostIndexBadge({
  indexable,
  hasIssue
}: {
  indexable: boolean;
  hasIssue?: boolean;
}) {
  if (!indexable) {
    return (
      <span className="inline-flex rounded-full border border-zinc-600/30 bg-zinc-800/50 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
        Noindex
      </span>
    );
  }
  if (hasIssue) {
    return (
      <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-100">
        Index · SEO thiếu
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-100">
      Index
    </span>
  );
}

export function ContentPostTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${TYPE_COLORS[type] ?? "border-white/10 bg-white/5 text-zinc-300"}`}
    >
      {type}
    </span>
  );
}

export function ContentPostSeoScoreBadge({ score }: { score: number }) {
  const meta = getSeoScoreLabel(score);
  const toneClass =
    meta.tone === "good"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : meta.tone === "ok"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
        : "border-red-400/30 bg-red-400/10 text-red-100";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass}`}>
      SEO {score} · {meta.label}
    </span>
  );
}

export function formatContentPostDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
