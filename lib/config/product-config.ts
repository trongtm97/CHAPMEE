import { readEnv, readEnvFlag } from "@/lib/env/legacy-env";
import { unstable_cache } from "next/cache";
import { fetchMonetizationSettings } from "@/lib/supabase/monetization-settings";
import type {
  DesktopHomeMode,
  MobileDefaultTab,
  ProductConfig
} from "@/types/product-config";

const DEFAULT_PRODUCT_CONFIG: ProductConfig = {
  product: {
    swipeFirstEnabled: true,
    mobileDefaultTab: "home",
    desktopHomeMode: "swipe_feed"
  },
  swipe: {
    desktopShowLeftPanel: true,
    desktopShowRightPanel: true,
    desktopCenterCardWidth: 480,
    showStoryInfoPanel: true,
    showCommentPanel: true,
    showAuthorPanel: true,
    showRankingPanel: true
  }
};

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asMobileDefaultTab(value: unknown, fallback: MobileDefaultTab): MobileDefaultTab {
  return value === "home" || value === "swipe" ? value : fallback;
}

function asDesktopHomeMode(value: unknown, fallback: DesktopHomeMode): DesktopHomeMode {
  return value === "swipe_feed" || value === "portal_home" ? value : fallback;
}

function asCenterCardWidth(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(640, Math.max(520, Math.round(numeric)));
}

function shouldSkipRemoteProductConfig() {
  const flag = readEnvFlag("CHAPMEE_SKIP_REMOTE_CONFIG", "CHAPCHAP_SKIP_REMOTE_CONFIG");
  if (flag === true) {
    return true;
  }
  if (flag === false) {
    return false;
  }
  return process.env.NODE_ENV === "development";
}

async function loadProductConfig(): Promise<ProductConfig> {
  if (shouldSkipRemoteProductConfig()) {
    return DEFAULT_PRODUCT_CONFIG;
  }

  const rows = await fetchMonetizationSettings();
  const rawSettings = new Map<string, unknown>();

  for (const row of rows) {
    rawSettings.set(row.key, row.value);
  }

  return {
    product: {
      swipeFirstEnabled: asBoolean(
        rawSettings.get("product.swipe_first_enabled"),
        DEFAULT_PRODUCT_CONFIG.product.swipeFirstEnabled
      ),
      mobileDefaultTab: asMobileDefaultTab(
        rawSettings.get("product.mobile_default_tab"),
        DEFAULT_PRODUCT_CONFIG.product.mobileDefaultTab
      ),
      desktopHomeMode: asDesktopHomeMode(
        rawSettings.get("product.desktop_home_mode"),
        DEFAULT_PRODUCT_CONFIG.product.desktopHomeMode
      )
    },
    swipe: {
      desktopShowLeftPanel: asBoolean(
        rawSettings.get("swipe.desktop_show_left_panel"),
        DEFAULT_PRODUCT_CONFIG.swipe.desktopShowLeftPanel
      ),
      desktopShowRightPanel: asBoolean(
        rawSettings.get("swipe.desktop_show_right_panel"),
        DEFAULT_PRODUCT_CONFIG.swipe.desktopShowRightPanel
      ),
      desktopCenterCardWidth: asCenterCardWidth(
        rawSettings.get("swipe.desktop_center_card_width"),
        DEFAULT_PRODUCT_CONFIG.swipe.desktopCenterCardWidth
      ),
      showStoryInfoPanel: asBoolean(
        rawSettings.get("swipe.show_story_info_panel"),
        DEFAULT_PRODUCT_CONFIG.swipe.showStoryInfoPanel
      ),
      showCommentPanel: asBoolean(
        rawSettings.get("swipe.show_comment_panel"),
        DEFAULT_PRODUCT_CONFIG.swipe.showCommentPanel
      ),
      showAuthorPanel: asBoolean(
        rawSettings.get("swipe.show_author_panel"),
        DEFAULT_PRODUCT_CONFIG.swipe.showAuthorPanel
      ),
      showRankingPanel: asBoolean(
        rawSettings.get("swipe.show_ranking_panel"),
        DEFAULT_PRODUCT_CONFIG.swipe.showRankingPanel
      )
    }
  };
}

const getCachedProductConfig = unstable_cache(loadProductConfig, ["product-config"], {
  revalidate: 60,
  tags: ["monetization-settings"]
});

export async function getProductConfig() {
  try {
    return await getCachedProductConfig();
  } catch {
    return DEFAULT_PRODUCT_CONFIG;
  }
}

/** Same as getProductConfig — kept for call sites that must avoid blocking dev startup. */
export async function getProductConfigFast() {
  return getProductConfig();
}
