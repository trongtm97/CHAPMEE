/** Tailwind classes for story image placeholder surfaces (no remote image). */
export const STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS =
  "bg-gradient-to-br from-cyan-300/30 via-sky-300/20 to-indigo-500/30";

export const STORY_IMAGE_PLACEHOLDER_BLUR_CLASS =
  "bg-gradient-to-br from-cyan-400/25 via-slate-700/40 to-indigo-900/50";

export function getStoryPlaceholderInitial(title: string) {
  const trimmed = title.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "C";
}
