import { getMonetizationConfig } from "@/lib/monetization/config";
import {
  getTopSupportersApp,
  getTopSupportersByAuthor,
  getTopSupportersByStory
} from "@/lib/supabase/tips";

export async function getSupporterRankingForStory(storyId: string, limit = 5) {
  const config = await getMonetizationConfig();
  if (!Boolean(config.settings["supporter_ranking.enabled"])) {
    return { data: [], error: null };
  }
  return getTopSupportersByStory(storyId, limit);
}

export async function getSupporterRankingForAuthor(
  creatorUserId: string,
  limit = 5
) {
  const config = await getMonetizationConfig();
  if (!Boolean(config.settings["supporter_ranking.enabled"])) {
    return { data: [], error: null };
  }
  return getTopSupportersByAuthor(creatorUserId, limit);
}

export async function getSupporterRankingForApp(limit = 10) {
  const config = await getMonetizationConfig();
  if (!Boolean(config.settings["supporter_ranking.enabled"])) {
    return { data: [], error: null };
  }
  return getTopSupportersApp(limit);
}
