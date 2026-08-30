import { parseMediaTab } from "@/lib/media/media-tabs";

export const NAV_ROUTES = {
  reels: "/reels",
  originalStories: "/truyen-sang-tac",
  translationStories: "/truyen-dich",
  media: "/media",
  audio: "/media?tab=audio",
  video: "/media?tab=video",
  discover: "/discover",
  utilities: "/tien-ich",
  community: "/community",
  posts: "/bai-viet",
  rankings: "/bang-xep-hang"
} as const;

export function isReelsNavRoute(pathname: string) {
  return pathname === "/" || pathname.startsWith("/reels");
}

export function isOriginalStoryNavRoute(pathname: string) {
  return pathname === "/truyen-sang-tac" || pathname.startsWith("/truyen-sang-tac/");
}

export function isTranslationStoryNavRoute(pathname: string) {
  return pathname === "/truyen-dich" || pathname.startsWith("/truyen-dich/");
}

export function isAudioNavRoute(pathname: string, tab?: string | null) {
  if (pathname === "/audio" || pathname.startsWith("/audio/")) {
    return true;
  }
  if (pathname === "/media" || pathname.startsWith("/media/")) {
    return parseMediaTab(tab ?? undefined) === "audio";
  }
  return false;
}

export function isVideoNavRoute(pathname: string, tab?: string | null) {
  if (pathname !== "/media" && !pathname.startsWith("/media/")) {
    return false;
  }
  return parseMediaTab(tab ?? undefined) === "video";
}

export function isDiscoverNavRoute(pathname: string) {
  return pathname === "/discover" || pathname.startsWith("/discover/");
}

export function isUtilitiesNavRoute(pathname: string) {
  return pathname === "/tien-ich" || pathname.startsWith("/tien-ich/");
}

export function isCommunityNavRoute(pathname: string) {
  return pathname === "/community" || pathname.startsWith("/community/");
}

export function isPostsNavRoute(pathname: string) {
  return pathname === "/bai-viet" || pathname.startsWith("/bai-viet/");
}

export function isRankingsNavRoute(pathname: string) {
  return pathname === "/bang-xep-hang" || pathname.startsWith("/bang-xep-hang/");
}

export function isStoriesCatalogNavRoute(pathname: string) {
  return pathname === "/truyen" || pathname.startsWith("/truyen/");
}

export function isMediaNavRoute(pathname: string, _tab?: string | null) {
  if (pathname === "/audio" || pathname.startsWith("/audio/")) {
    return true;
  }
  return pathname === "/media" || pathname.startsWith("/media/");
}

export function isNavItemActive(pathname: string, href: string, tab?: string | null) {
  if (href === "/" || href === "/reels") {
    return isReelsNavRoute(pathname);
  }
  if (href === NAV_ROUTES.originalStories) {
    return isOriginalStoryNavRoute(pathname);
  }
  if (href === NAV_ROUTES.translationStories) {
    return isTranslationStoryNavRoute(pathname);
  }
  if (href === NAV_ROUTES.media || href === "/media") {
    return isMediaNavRoute(pathname, tab);
  }
  if (href === NAV_ROUTES.audio) {
    return isAudioNavRoute(pathname, tab);
  }
  if (href === NAV_ROUTES.video) {
    return isVideoNavRoute(pathname, tab);
  }
  if (href === NAV_ROUTES.discover) {
    return isDiscoverNavRoute(pathname);
  }
  if (href === NAV_ROUTES.utilities) {
    return isUtilitiesNavRoute(pathname);
  }
  if (href === NAV_ROUTES.community) {
    return isCommunityNavRoute(pathname);
  }
  if (href === NAV_ROUTES.posts) {
    return isPostsNavRoute(pathname);
  }
  if (href === NAV_ROUTES.rankings) {
    return isRankingsNavRoute(pathname);
  }
  if (href === "/me") {
    return pathname === "/me" || pathname.startsWith("/me/");
  }
  if (href === "/truyen") {
    return isStoriesCatalogNavRoute(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
