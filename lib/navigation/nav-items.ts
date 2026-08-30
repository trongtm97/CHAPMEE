import type { ComponentType } from "react";
import {
  ArticleNavIcon,
  AudioNavIcon,
  CommunityNavIcon,
  DiscoverNavIcon,
  LibraryNavIcon,
  LoveNavIcon,
  MediaNavIcon,
  OriginalStoryNavIcon,
  ProfileNavIcon,
  RankingNavIcon,
  ReelsNavIcon,
  TranslationStoryNavIcon,
  UtilitiesNavIcon,
  VideoNavIcon
} from "@/components/navigation/AppNavIcons";
import {
  isNavItemActive,
  isReelsNavRoute,
  NAV_ROUTES
} from "@/lib/navigation/active-route";

export {
  isAudioNavRoute,
  isCommunityNavRoute,
  isDiscoverNavRoute,
  isMediaNavRoute,
  isNavItemActive,
  isOriginalStoryNavRoute,
  isTranslationStoryNavRoute,
  isUtilitiesNavRoute,
  isPostsNavRoute,
  isRankingsNavRoute,
  isReelsNavRoute,
  isStoriesCatalogNavRoute,
  isVideoNavRoute,
  NAV_ROUTES
} from "@/lib/navigation/active-route";

type NavIconComponent = ComponentType<{ className?: string; active?: boolean }>;

/** Desktop header visual emphasis — configured in nav, styled in DesktopHeader. */
export type HeaderNavEmphasis = "hot" | "featured" | "honor";

export type NavItemConfig = {
  href: string;
  label: string;
  icon?: NavIconComponent;
  headerEmphasis?: HeaderNavEmphasis;
};

/** Desktop header — order per IA. */
export const DESKTOP_HEADER_NAV: NavItemConfig[] = [
  {
    href: NAV_ROUTES.originalStories,
    label: "Truyện sáng tác",
    icon: OriginalStoryNavIcon,
    headerEmphasis: "hot"
  },
  { href: NAV_ROUTES.translationStories, label: "Truyện dịch", icon: TranslationStoryNavIcon },
  {
    href: NAV_ROUTES.discover,
    label: "Khám phá",
    icon: DiscoverNavIcon,
    headerEmphasis: "featured"
  },
  { href: NAV_ROUTES.utilities, label: "Tiện ích", icon: UtilitiesNavIcon },
  {
    href: NAV_ROUTES.rankings,
    label: "Bảng xếp hạng",
    icon: RankingNavIcon,
    headerEmphasis: "honor"
  },
  { href: NAV_ROUTES.posts, label: "Bài viết", icon: ArticleNavIcon }
];

/** Desktop sidebar — Khám phá group. */
export const SIDEBAR_EXPLORE_NAV: NavItemConfig[] = [
  { href: NAV_ROUTES.reels, label: "Reels", icon: ReelsNavIcon },
  { href: NAV_ROUTES.originalStories, label: "Truyện sáng tác", icon: OriginalStoryNavIcon },
  { href: NAV_ROUTES.audio, label: "Audio", icon: AudioNavIcon },
  { href: NAV_ROUTES.video, label: "Video", icon: VideoNavIcon },
  { href: NAV_ROUTES.discover, label: "Khám phá", icon: DiscoverNavIcon },
  {
    href: "/tien-ich/boi-tinh-yeu",
    label: "Bói tình yêu",
    icon: LoveNavIcon,
    headerEmphasis: "hot"
  },
  { href: NAV_ROUTES.utilities, label: "Tiện ích", icon: UtilitiesNavIcon },
  { href: "/truyen", label: "Danh mục truyện", icon: LibraryNavIcon },
  { href: NAV_ROUTES.community, label: "Cộng đồng", icon: CommunityNavIcon },
  { href: NAV_ROUTES.rankings, label: "Bảng xếp hạng", icon: RankingNavIcon },
  { href: NAV_ROUTES.posts, label: "Bài viết", icon: ArticleNavIcon }
];

/** Mobile bottom nav — Reels, Media, Khám phá, Cộng đồng, Tôi. */
export const MOBILE_BOTTOM_NAV: NavItemConfig[] = [
  { href: "/", label: "Reels", icon: ReelsNavIcon },
  { href: NAV_ROUTES.media, label: "Media", icon: MediaNavIcon },
  { href: NAV_ROUTES.discover, label: "Khám phá", icon: DiscoverNavIcon },
  { href: NAV_ROUTES.community, label: "Cộng đồng", icon: CommunityNavIcon },
  { href: "/me", label: "Tôi", icon: ProfileNavIcon }
];

/** @deprecated Use MOBILE_BOTTOM_NAV hrefs. */
export const PRIMARY_NAV_HREFS = MOBILE_BOTTOM_NAV.map((item) => item.href) as readonly string[];

export function isNavActive(pathname: string, href: string, tab?: string | null) {
  return isNavItemActive(pathname, href, tab);
}
