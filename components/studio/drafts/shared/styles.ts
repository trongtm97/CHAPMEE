export const draftsBtnPrimary =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:w-auto";

export const draftsBtnSecondary =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:w-auto";

export const draftsBtnCompactPrimary =
  "inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-lg bg-cyan-300 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-cyan-200 sm:min-h-9 sm:w-auto sm:text-sm";

export const draftsBtnCompactSecondary =
  "inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-100 transition hover:bg-white/[0.08] sm:min-h-9 sm:w-auto sm:text-sm";

export const draftsBtnDanger =
  "inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-lg border border-red-400/40 bg-red-400/10 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-400/20 sm:min-h-9 sm:w-auto sm:text-sm";

export const draftsBtnGhost =
  "inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white sm:min-h-9 sm:text-sm";

export const DRAFT_TYPE_LABELS = {
  chapter: "Chương",
  reels: "Reels",
  seo: "SEO",
  story: "Truyện",
  template: "Mẫu"
} as const;

export const DRAFT_STATUS_LABELS = {
  autosaved: "Đã tự lưu",
  missing_content: "Thiếu nội dung",
  missing_title: "Thiếu tiêu đề",
  not_ready: "Chưa đủ điều kiện đăng",
  stale: "Nháp cũ",
  writing: "Đang viết"
} as const;

export function formatDraftWhen(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function formatRelativeDraftWhen(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "Vừa xong";
  }

  if (minutes < 60) {
    return `${minutes} phút trước`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} giờ trước`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days} ngày trước`;
  }

  return formatDraftWhen(value);
}
