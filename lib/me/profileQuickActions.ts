export const ME_READING_SECTION_IDS = {
  continue: "me-section-continue",
  saved: "me-section-saved",
  collections: "me-section-collections",
  groups: "me-section-groups"
} as const;

export type MeReadingSection = keyof typeof ME_READING_SECTION_IDS;

export function buildMeReadingHref(section: MeReadingSection) {
  const tabMap: Record<MeReadingSection, string> = {
    continue: "reading",
    saved: "saved",
    collections: "collections",
    groups: "following"
  };
  return `/me/library?tab=${tabMap[section]}`;
}

export function buildMeQuickActionHref(
  actionId: string,
  options: { isCreator: boolean; showCoinWallet: boolean }
) {
  switch (actionId) {
    case "continue":
      return "/me/library?tab=reading";
    case "collections":
      return "/me/library?tab=collections";
    case "saved":
      return "/me/library?tab=saved";
    case "groups":
      return "/me/library?tab=following";
    case "wallet":
      return options.showCoinWallet ? "/wallet?from=me" : "/me#cai-dat";
    case "studio":
      return "/studio";
    default:
      return "/me";
  }
}

export function parseMeReadingSection(value: string | null): MeReadingSection | null {
  if (
    value === "continue" ||
    value === "saved" ||
    value === "collections" ||
    value === "groups"
  ) {
    return value;
  }
  return null;
}
