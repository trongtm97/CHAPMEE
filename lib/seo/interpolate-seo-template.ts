/** Client-safe SEO template interpolation (no server / DB imports). */

export type SeoTemplateVariables = {
  site_name?: string | null;
  page_title?: string | null;
  story_title?: string | null;
  chapter_title?: string | null;
  author_name?: string | null;
  username?: string | null;
  genre?: string | null;
  genres?: string | null;
  chapter_count?: string | number | null;
  status?: string | null;
  year?: string | number | null;
  page?: string | number | null;
  taxonomy_name?: string | null;
  genre_name?: string | null;
  category_name?: string | null;
  post_title?: string | null;
  post_excerpt?: string | null;
  short_description?: string | null;
  chapter_number?: string | number | null;
  announcement_title?: string | null;
  reels_title?: string | null;
  current_year?: string | number | null;
};

const TITLE_WARN_MIN = 30;
const TITLE_WARN_MAX = 65;
const DESCRIPTION_WARN_MIN = 80;
const DESCRIPTION_WARN_MAX = 160;

function stringifyVar(value: string | number | null | undefined): string {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

export function interpolateSeoTemplate(
  template: string | null | undefined,
  vars: SeoTemplateVariables
): string {
  if (!template?.trim()) {
    return "";
  }

  const normalizedVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    normalizedVars[key] = stringifyVar(value);
  }

  if (!normalizedVars.genre_name && normalizedVars.genre) {
    normalizedVars.genre_name = normalizedVars.genre;
  }
  if (!normalizedVars.genre && normalizedVars.genre_name) {
    normalizedVars.genre = normalizedVars.genre_name;
  }
  if (!normalizedVars.page_title && normalizedVars.story_title) {
    normalizedVars.page_title = normalizedVars.story_title;
  }

  let result = template
    .replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, key: string) => normalizedVars[key] ?? "")
    .replace(/\{([a-z0-9_]+)\}/gi, (_, key: string) => normalizedVars[key] ?? "");

  result = result
    .replace(/\{\{[a-z0-9_]+\}\}/gi, "")
    .replace(/\{[a-z0-9_]+\}/gi, "")
    .replace(/\s[-–—|·]+\s*(?=[|·]|$)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([|·\-–—])/g, " $1")
    .replace(/([|·\-–—])\s+/g, "$1 ")
    .replace(/^\s*[|·\-–—]\s*/g, "")
    .trim();

  return result;
}

export function warnSeoTitleLength(title: string): string[] {
  const len = title.trim().length;
  const warnings: string[] = [];
  if (!len) {
    return warnings;
  }
  if (len < TITLE_WARN_MIN) {
    warnings.push(`Title ngắn (${len} ký tự; khuyến nghị ${TITLE_WARN_MIN}–${TITLE_WARN_MAX}).`);
  }
  if (len > TITLE_WARN_MAX) {
    warnings.push(`Title dài (${len} ký tự; khuyến nghị tối đa ${TITLE_WARN_MAX}).`);
  }
  return warnings;
}

export function warnSeoDescriptionLength(description: string): string[] {
  const len = description.trim().length;
  const warnings: string[] = [];
  if (!len) {
    return warnings;
  }
  if (len < DESCRIPTION_WARN_MIN) {
    warnings.push(
      `Description ngắn (${len} ký tự; khuyến nghị ${DESCRIPTION_WARN_MIN}–${DESCRIPTION_WARN_MAX}).`
    );
  }
  if (len > DESCRIPTION_WARN_MAX) {
    warnings.push(
      `Description dài (${len} ký tự; khuyến nghị tối đa ${DESCRIPTION_WARN_MAX}).`
    );
  }
  return warnings;
}
