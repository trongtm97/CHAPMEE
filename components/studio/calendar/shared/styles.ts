export const calendarBtnPrimary =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:w-auto";

export const calendarBtnSecondary =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:w-auto";

export const calendarBtnCompactPrimary =
  "inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-lg bg-cyan-300 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-cyan-200 sm:min-h-9 sm:w-auto sm:text-sm";

export const calendarBtnCompactSecondary =
  "inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-100 transition hover:bg-white/[0.08] sm:min-h-9 sm:w-auto sm:text-sm";

export const calendarBtnDanger =
  "inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-lg border border-red-400/40 bg-red-400/10 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-400/20 sm:min-h-9 sm:w-auto sm:text-sm";

export function statusBadgeClass(
  status: "scheduled" | "published" | "failed" | "canceled",
  isToday?: boolean
) {
  if (status === "failed") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }

  if (status === "canceled") {
    return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
  }

  if (status === "published") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (isToday) {
    return "border-cyan-300/40 bg-cyan-300/15 text-cyan-100";
  }

  return "border-sky-400/30 bg-sky-400/10 text-sky-200";
}

export function statusDisplayLabel(
  status: "scheduled" | "published" | "failed" | "canceled",
  isToday?: boolean
) {
  if (status === "scheduled") {
    return isToday ? "Hôm nay" : "Sắp tới";
  }

  if (status === "published") {
    return "Đã đăng";
  }

  if (status === "failed") {
    return "Lỗi";
  }

  return "Đã hủy";
}
