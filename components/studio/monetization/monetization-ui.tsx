import type { ReactNode } from "react";
import type { StoryAdminCompletionStatus } from "@/types/story-completion";
import type { StudioStoryMonetizationRow } from "@/types/studio-monetization";
import {
  resolveTransactionKind,
  type MonetizationTxKind
} from "@/lib/studio/monetization-display-utils";

export type MonetizationTone =
  | "cyan"
  | "green"
  | "amber"
  | "purple"
  | "blue"
  | "rose"
  | "slate";

const TONE_STYLES: Record<
  MonetizationTone,
  { badge: string; card: string; dot: string; chip: string; chipActive: string; button: string }
> = {
  cyan: {
    badge: "border-cyan-400/50 bg-cyan-500/20 text-cyan-50",
    card: "border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.08] to-transparent",
    dot: "bg-cyan-400",
    chip: "border-white/10 text-zinc-400 hover:border-cyan-400/30 hover:text-cyan-100",
    chipActive: "border-cyan-400/40 bg-cyan-400/10 text-cyan-100",
    button:
      "border-cyan-400/45 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30 focus-visible:outline-cyan-400"
  },
  green: {
    badge: "border-emerald-400/50 bg-emerald-500/20 text-emerald-50",
    card: "border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.08] to-transparent",
    dot: "bg-emerald-400",
    chip: "border-white/10 text-zinc-400 hover:border-emerald-400/30 hover:text-emerald-100",
    chipActive: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
    button:
      "border-emerald-400/45 bg-emerald-500/25 text-emerald-50 hover:bg-emerald-500/35 focus-visible:outline-emerald-400"
  },
  amber: {
    badge: "border-amber-400/50 bg-amber-500/20 text-amber-50",
    card: "border-amber-400/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent",
    dot: "bg-amber-400",
    chip: "border-white/10 text-zinc-400 hover:border-amber-400/30 hover:text-amber-100",
    chipActive: "border-amber-400/40 bg-amber-400/10 text-amber-100",
    button:
      "border-amber-400/45 bg-amber-500/15 text-amber-50 hover:bg-amber-500/25 focus-visible:outline-amber-400"
  },
  purple: {
    badge: "border-violet-400/50 bg-violet-500/20 text-violet-50",
    card: "border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] to-transparent",
    dot: "bg-violet-400",
    chip: "border-white/10 text-zinc-400 hover:border-violet-400/30 hover:text-violet-100",
    chipActive: "border-violet-400/40 bg-violet-400/10 text-violet-100",
    button:
      "border-violet-400/45 bg-violet-500/20 text-violet-50 hover:bg-violet-500/30 focus-visible:outline-violet-400"
  },
  blue: {
    badge: "border-sky-400/50 bg-sky-500/20 text-sky-50",
    card: "border-sky-400/20 bg-gradient-to-br from-sky-500/[0.08] to-transparent",
    dot: "bg-sky-400",
    chip: "border-white/10 text-zinc-400 hover:border-sky-400/30 hover:text-sky-100",
    chipActive: "border-sky-400/40 bg-sky-400/10 text-sky-100",
    button:
      "border-sky-400/45 bg-sky-500/20 text-sky-50 hover:bg-sky-500/30 focus-visible:outline-sky-400"
  },
  rose: {
    badge: "border-rose-400/50 bg-rose-500/20 text-rose-50",
    card: "border-rose-400/20 bg-gradient-to-br from-rose-500/[0.08] to-transparent",
    dot: "bg-rose-400",
    chip: "border-white/10 text-zinc-400 hover:border-rose-400/30 hover:text-rose-100",
    chipActive: "border-rose-400/40 bg-rose-400/10 text-rose-100",
    button:
      "border-rose-400/45 bg-rose-500/15 text-rose-50 hover:bg-rose-500/25 focus-visible:outline-rose-400"
  },
  slate: {
    badge: "border-zinc-400/40 bg-zinc-600/25 text-zinc-200",
    card: "border-white/10 bg-white/[0.02]",
    dot: "bg-zinc-500",
    chip: "border-white/10 text-zinc-400 hover:border-zinc-400/30 hover:text-zinc-200",
    chipActive: "border-zinc-400/40 bg-zinc-500/10 text-zinc-200",
    button:
      "border-zinc-500/40 bg-zinc-700/30 text-zinc-200 hover:bg-zinc-700/45 focus-visible:outline-zinc-400"
  }
};

export function MonetizationBadge({
  tone,
  children,
  className = ""
}: {
  tone: MonetizationTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-snug ${TONE_STYLES[tone].badge} ${className}`}
    >
      {children}
    </span>
  );
}

export function MonetizationTableButton({
  tone,
  children,
  className = "",
  disabled,
  onClick,
  type = "button",
  title,
  ...rest
}: {
  tone: MonetizationTone;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  title?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type">) {
  return (
    <button
      className={`inline-flex h-7 shrink-0 items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-none normal-case transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${TONE_STYLES[tone].button} ${className}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
      {...rest}
    >
      {children}
    </button>
  );
}

export function getStoryStatusBadge(story: StudioStoryMonetizationRow) {
  if (story.isCompleted) {
    return { label: "Hoàn thành", tone: "blue" as const };
  }
  if (story.visibility !== "public" || story.status === "hidden") {
    return { label: "Đã ẩn", tone: "slate" as const };
  }
  if (story.status === "published" || story.status === "approved") {
    return { label: "Đang đăng", tone: "green" as const };
  }
  return { label: "Nháp", tone: "amber" as const };
}

export function MonetizationKpiCard({
  tone,
  label,
  value,
  hint,
  muted = false
}: {
  tone: MonetizationTone;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <article
      className={`flex h-full min-h-[7.5rem] flex-col rounded-2xl border p-4 ${TONE_STYLES[tone].card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
        <span
          aria-hidden
          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${TONE_STYLES[tone].dot}`}
        />
      </div>
      <p
        className={`mt-2 text-lg font-bold sm:text-xl ${muted ? "text-zinc-500" : "text-white"}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-auto pt-2 text-xs leading-relaxed text-zinc-500">{hint}</p>
      ) : (
        <span className="mt-auto block min-h-[1.25rem]" />
      )}
    </article>
  );
}

export function MonetizationFilterChip({
  active,
  onClick,
  disabled,
  children
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60 disabled:opacity-50 ${
        active ? TONE_STYLES.cyan.chipActive : TONE_STYLES.slate.chip
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function MonetizationKpiSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="h-3 w-24 rounded bg-white/10" />
      <div className="mt-3 h-7 w-32 rounded bg-white/10" />
      <div className="mt-2 h-3 w-20 rounded bg-white/5" />
    </div>
  );
}

export function MonetizationTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2 rounded-xl border border-white/10 p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="flex gap-3 border-t border-white/5 pt-3 first:border-0 first:pt-0" key={index}>
          <div className="h-12 w-9 rounded bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-white/10" />
            <div className="h-3 w-1/3 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function getPaidStatusBadge(story: StudioStoryMonetizationRow) {
  const hasPaid =
    story.paidChapterCount > 0 || story.monetizationEnabled || story.autoPricingEnabled;

  if (hasPaid) {
    return { label: "Trả phí", tone: "green" as const };
  }

  if (
    !story.fullAccessEnabled &&
    story.paidChapterCount === 0 &&
    !story.autoPricingEnabled &&
    story.totalChapterCount > 0
  ) {
    return { label: "Miễn phí", tone: "slate" as const };
  }

  return { label: "Chưa cấu hình", tone: "amber" as const };
}

export function getBundleStatusBadge(story: StudioStoryMonetizationRow) {
  if (!story.fullAccessEnabled) {
    return { label: "Tắt", tone: "slate" as const };
  }

  const status = story.adminCompletionStatus ?? "not_requested";

  if (status === "approved") {
    return { label: "Hoàn thành đã xác nhận", tone: "green" as const };
  }
  if (status === "pending_review") {
    return { label: "Chờ admin xác nhận hoàn thành", tone: "amber" as const };
  }
  if (status === "rejected") {
    return { label: "Bị từ chối", tone: "rose" as const };
  }
  if ((story.lockedFullStoryRevenueVnd ?? 0) > 0) {
    return { label: "Đang giữ tiền", tone: "amber" as const };
  }
  return { label: "Có bán trọn bộ", tone: "purple" as const };
}

export function parseAdminCompletionStatus(
  value: unknown
): StoryAdminCompletionStatus {
  const status = String(value ?? "not_requested");
  if (
    status === "pending_review" ||
    status === "approved" ||
    status === "rejected"
  ) {
    return status;
  }
  return "not_requested";
}

export type { MonetizationTxKind } from "@/lib/studio/monetization-display-utils";
export { resolveTransactionKind } from "@/lib/studio/monetization-display-utils";

export function transactionKindTone(kind: MonetizationTxKind): MonetizationTone {
  switch (kind) {
    case "bundle":
      return "purple";
    case "chapter":
      return "blue";
    case "tip":
      return "rose";
    case "refund":
      return "amber";
    default:
      return "slate";
  }
}
