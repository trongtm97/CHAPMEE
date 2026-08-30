import type {
  LegacyPublicProfileTab,
  PublicProfileTab
} from "@/types/public-profile";

const CANONICAL_TABS = new Set<PublicProfileTab>([
  "stories",
  "reels",
  "community",
  "achievements",
  "about"
]);

const LEGACY_TAB_MAP: Record<LegacyPublicProfileTab, PublicProfileTab> = {
  works: "stories",
  badges: "achievements",
  collections: "about",
  activity: "about",
  comments: "about"
};

export function resolvePublicProfileTab(
  raw: string | undefined,
  visibleTabs: PublicProfileTab[]
): PublicProfileTab {
  if (raw && CANONICAL_TABS.has(raw as PublicProfileTab)) {
    const tab = raw as PublicProfileTab;
    if (visibleTabs.includes(tab)) {
      return tab;
    }
  }

  if (raw && raw in LEGACY_TAB_MAP) {
    const mapped = LEGACY_TAB_MAP[raw as LegacyPublicProfileTab];
    if (visibleTabs.includes(mapped)) {
      return mapped;
    }
  }

  return visibleTabs[0] ?? "about";
}
