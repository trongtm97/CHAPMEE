export const reelsBtnPrimary =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:w-auto";

export const reelsBtnSecondary =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.08] sm:min-h-10 sm:w-auto";

export const reelsBtnCompactPrimary =
  "inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-lg bg-cyan-300 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-cyan-200 sm:min-h-9 sm:w-auto sm:text-sm";

export const reelsBtnCompactSecondary =
  "inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-100 transition hover:bg-white/[0.08] sm:min-h-9 sm:w-auto sm:text-sm";

export const reelsBtnDanger =
  "inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-lg border border-red-400/40 bg-red-400/10 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-400/20 sm:min-h-9 sm:w-auto sm:text-sm";

export const reelsBtnGhost =
  "inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white sm:min-h-9 sm:text-sm";

export function statusBadgeClass(status: string) {
  switch (status) {
    case "published":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "scheduled":
      return "border-violet-400/30 bg-violet-400/10 text-violet-200";
    case "rejected":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "hidden":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
    case "draft":
    default:
      return "border-zinc-400/30 bg-zinc-400/10 text-zinc-300";
  }
}
