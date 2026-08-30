export function normalizeImportTitle(title: string) {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buildStoryDedupeKey(title: string, sourceName: string | null) {
  return `${normalizeImportTitle(title)}::${(sourceName ?? "").toLowerCase().trim()}`;
}

export function buildChapterDedupeKey(
  storyKey: string,
  chapterNumber: number | null,
  chapterTitle: string
) {
  const numberPart =
    chapterNumber != null && Number.isFinite(chapterNumber) ? String(chapterNumber) : "na";
  return `${storyKey}::${numberPart}::${normalizeImportTitle(chapterTitle)}`;
}
