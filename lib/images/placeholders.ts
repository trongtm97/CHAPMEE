/** Tailwind classes for story image placeholder surfaces (no remote image). */
export const STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS =
  "bg-gradient-to-br from-slate-900 via-[#141c28] to-indigo-950";

export const STORY_IMAGE_PLACEHOLDER_BLUR_CLASS =
  "bg-gradient-to-br from-cyan-400/25 via-slate-700/40 to-indigo-900/50";

export function getStoryPlaceholderInitial(title: string) {
  const trimmed = title.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "C";
}

/** Short uppercase line for fallback cover — clamped by caller. */
export function getStoryCoverFallbackTitle(title: string, maxLength = 22): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return "";
  }
  const short =
    trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
  return short.toLocaleUpperCase("vi-VN");
}

/** Decorative texture for placeholder covers (3:4 book-like surface). */
export const STORY_IMAGE_PLACEHOLDER_TEXTURE_CLASS =
  "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_22%_18%,rgba(34,211,238,0.12),transparent_44%),radial-gradient(circle_at_78%_82%,rgba(99,102,241,0.14),transparent_48%)] after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-2/5 after:bg-gradient-to-b after:from-white/[0.06] after:to-transparent";

/** Inset frame on fallback covers. */
export const STORY_COVER_FALLBACK_FRAME_CLASS =
  "pointer-events-none absolute inset-[3px] rounded-[inherit] ring-1 ring-inset ring-white/[0.08]";
