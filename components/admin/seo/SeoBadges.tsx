import type { SeoRule } from "@/types/platform-content";

export function SeoIndexBadge({ indexable }: { indexable: boolean }) {
  if (indexable) {
    return (
      <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-100">
        Index
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-100">
      Noindex
    </span>
  );
}

export function SeoFollowBadge({ follow }: { follow: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        follow
          ? "border-sky-400/25 bg-sky-400/10 text-sky-100"
          : "border-zinc-600/30 bg-zinc-800/50 text-zinc-500"
      }`}
    >
      {follow ? "Follow" : "Nofollow"}
    </span>
  );
}

export function SeoCanonicalBadge({ mode }: { mode: SeoRule["canonical_mode"] }) {
  const styles = {
    self: "border-violet-400/25 bg-violet-400/10 text-violet-100",
    custom: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
    parent: "border-indigo-400/25 bg-indigo-400/10 text-indigo-100",
    none: "border-zinc-600/30 bg-zinc-800/50 text-zinc-400"
  } as const;

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles[mode]}`}>
      {mode}
    </span>
  );
}

export function formatSeoDate(value: string | null) {
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

export const AUDIT_SEVERITY_STYLES = {
  info: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  error: "border-red-400/30 bg-red-400/10 text-red-100",
  critical: "border-red-500/40 bg-red-500/15 text-red-100",
  ok: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
} as const;
