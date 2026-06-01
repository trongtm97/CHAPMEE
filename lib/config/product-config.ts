import { readEnvFlag } from "@/lib/env/legacy-env";
import { unstable_cache } from "next/cache";
import { fetchMonetizationSettings } from "@/lib/supabase/monetization-settings";
import type { ProductConfig } from "@/types/product-config";

const DEFAULT_PRODUCT_CONFIG: ProductConfig = {
  reels: {
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
    reels: {
      desktopShowLeftPanel: asBoolean(
        rawSettings.get("reels.desktop_show_left_panel"),
        DEFAULT_PRODUCT_CONFIG.reels.desktopShowLeftPanel
      ),
      desktopShowRightPanel: asBoolean(
        rawSettings.get("reels.desktop_show_right_panel"),
        DEFAULT_PRODUCT_CONFIG.reels.desktopShowRightPanel
      ),
      desktopCenterCardWidth: asCenterCardWidth(
        rawSettings.get("reels.desktop_center_card_width"),
        DEFAULT_PRODUCT_CONFIG.reels.desktopCenterCardWidth
      ),
      showStoryInfoPanel: asBoolean(
        rawSettings.get("reels.show_story_info_panel"),
        DEFAULT_PRODUCT_CONFIG.reels.showStoryInfoPanel
      ),
      showCommentPanel: asBoolean(
        rawSettings.get("reels.show_comment_panel"),
        DEFAULT_PRODUCT_CONFIG.reels.showCommentPanel
      ),
      showAuthorPanel: asBoolean(
        rawSettings.get("reels.show_author_panel"),
        DEFAULT_PRODUCT_CONFIG.reels.showAuthorPanel
      ),
      showRankingPanel: asBoolean(
        rawSettings.get("reels.show_ranking_panel"),
        DEFAULT_PRODUCT_CONFIG.reels.showRankingPanel
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
