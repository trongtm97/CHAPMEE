export type MobileDefaultTab = "home" | "swipe";

export type DesktopHomeMode = "swipe_feed" | "portal_home";

export type ProductConfig = {
  product: {
    swipeFirstEnabled: boolean;
    mobileDefaultTab: MobileDefaultTab;
    desktopHomeMode: DesktopHomeMode;
  };
  swipe: {
    desktopShowLeftPanel: boolean;
    desktopShowRightPanel: boolean;
    desktopCenterCardWidth: number;
    showStoryInfoPanel: boolean;
    showCommentPanel: boolean;
    showAuthorPanel: boolean;
    showRankingPanel: boolean;
  };
};
