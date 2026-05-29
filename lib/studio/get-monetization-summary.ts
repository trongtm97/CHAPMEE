import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { calculateCreatorEligibility } from "@/lib/monetization/eligibility";
import {
  getCreatorMonetizationProfile,
  getOrCreateCreatorMonetizationProfile
} from "@/lib/supabase/creator-monetization";
import { listCreatorPayoutAccounts, listPayoutRequestsForCreator } from "@/lib/supabase/payouts";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import { getOrCreateCreatorWallet } from "@/lib/wallets/creator-wallet";
import type { CreatorMonetizationProfile } from "@/types/creator-monetization";
import type {
  StudioMonetizationGateStatus,
  StudioMonetizationPageData,
  StudioStoryMonetizationRow
} from "@/types/studio-monetization";

function resolveGateStatus(options: {
  configEnabled: boolean;
  profile: CreatorMonetizationProfile | null;
  eligible: boolean;
}): StudioMonetizationGateStatus {
  if (!options.configEnabled) {
    return "disabled";
  }

  const profile = options.profile;

  if (!profile) {
    return options.eligible ? "not_eligible" : "not_eligible";
  }

  if (profile.status === "suspended") {
    return "suspended";
  }

  if (profile.status === "rejected") {
    return "rejected";
  }

  if (profile.status === "approved" && profile.monetization_enabled) {
    return "approved";
  }

  if (profile.status === "pending_review") {
    return "pending_review";
  }

  if (profile.status === "eligible" || options.eligible) {
    return "not_eligible";
  }

  return "not_eligible";
}

function formatVnd(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

export async function getStudioMonetizationSummary(
  creatorProfile: CreatorProfile,
  profileUserId: string
): Promise<StudioMonetizationPageData> {
  const config = await buildStudioMonetizationConfigView({ includePrivate: true });

  const configEnabled =
    config.ecosystemEnabled &&
    config.creatorMonetizationEnabled &&
    config.showMoneyUiToCreators;

  const [eligibility, profileResult, walletResult, payoutAccounts, payoutRequests] =
    await Promise.all([
      calculateCreatorEligibility(profileUserId),
      getOrCreateCreatorMonetizationProfile(profileUserId),
      configEnabled ? getOrCreateCreatorWallet(profileUserId) : Promise.resolve({ data: null, error: null }),
      configEnabled
        ? listCreatorPayoutAccounts(profileUserId)
        : Promise.resolve({ data: [], error: null }),
      configEnabled
        ? listPayoutRequestsForCreator(profileUserId, 10)
        : Promise.resolve({ data: [], error: null })
    ]);

  const profile = profileResult.data;
  const gateStatus = resolveGateStatus({
    configEnabled,
    profile,
    eligible: eligibility.eligible
  });

  const canConfigure =
    configEnabled && gateStatus === "approved" && Boolean(profile?.monetization_enabled);

  const emptyOverview = {
    availableRevenueVnd: 0,
    pendingRevenueVnd: 0,
    lockedRevenueVnd: 0,
    totalEarnedVnd: 0,
    totalWithdrawnVnd: 0,
    tipsReceivedVnd: 0,
    paidUnlockCount: 0,
    paidUnlockRevenueVnd: 0,
    grossRevenueVnd: 0,
    platformFeeVnd: 0,
    creatorNetRevenueVnd: 0,
    hasWallet: false
  };

  if (!configEnabled) {
    return {
      gateStatus: "disabled",
      canConfigure: false,
      config,
      overview: emptyOverview,
      eligibility,
      profile,
      stories: [],
      wallet: null,
      payoutAccounts: [],
      payoutRequests: [],
      error: null
    };
  }

  const supabase = await createClient();

  const { data: stories, error: storiesError } = await supabase
    .from("stories")
    .select("id, title, slug")
    .eq("creator_id", creatorProfile.id)
    .order("updated_at", { ascending: false });

  if (storiesError) {
    return {
      gateStatus,
      canConfigure,
      config,
      overview: emptyOverview,
      eligibility,
      profile,
      stories: [],
      wallet: walletResult.data,
      payoutAccounts: payoutAccounts.data,
      payoutRequests: payoutRequests.data,
      error: storiesError.message
    };
  }

  const storyIds = (stories ?? []).map((row) => row.id);

  const revenueByStory = new Map<string, number>();
  const paidCountByStory = new Map<string, number>();
  const totalChaptersByStory = new Map<string, number>();
  const freeChaptersByStory = new Map<string, number>();
  const priceByStory = new Map<string, number | null>();

  let tipsReceivedVnd = 0;
  let paidUnlockCount = 0;
  let paidUnlockRevenueVnd = 0;
  let grossRevenueVnd = 0;
  let platformFeeVnd = 0;
  let creatorNetRevenueVnd = 0;

  if (canConfigure && storyIds.length > 0) {
    const [{ data: episodes }, { data: monetizationRows }, { data: txRows }] = await Promise.all([
      supabase
        .from("episodes")
        .select("id, story_id, episode_number, status")
        .in("story_id", storyIds)
        .neq("status", "archived"),
      supabase
        .from("chapter_monetization_settings")
        .select("story_id, chapter_id, is_paid, coin_price")
        .in("story_id", storyIds),
      supabase
        .from("transactions")
        .select(
          "story_id, type, source, net_amount_vnd, creator_gross_vnd, platform_fee_vnd, status"
        )
        .eq("creator_user_id", profileUserId)
        .eq("status", "completed")
    ]);

    for (const episode of episodes ?? []) {
      const storyId = episode.story_id as string;
      totalChaptersByStory.set(storyId, (totalChaptersByStory.get(storyId) ?? 0) + 1);
    }

    const episodeNumber = new Map(
      (episodes ?? []).map((row) => [row.id as string, Number(row.episode_number)])
    );

    for (const row of monetizationRows ?? []) {
      const storyId = row.story_id as string;
      const chapterId = row.chapter_id as string;
      const episodeNum = episodeNumber.get(chapterId) ?? 0;

      if (row.is_paid) {
        paidCountByStory.set(storyId, (paidCountByStory.get(storyId) ?? 0) + 1);

        if (row.coin_price != null && !priceByStory.has(storyId)) {
          priceByStory.set(storyId, Number(row.coin_price));
        }
      } else if (episodeNum > 0) {
        const currentFree = freeChaptersByStory.get(storyId) ?? 0;
        freeChaptersByStory.set(storyId, Math.max(currentFree, episodeNum));
      }
    }

    for (const tx of txRows ?? []) {
      const net = Number(tx.net_amount_vnd ?? tx.creator_gross_vnd ?? 0);
      const gross = Number(tx.creator_gross_vnd ?? net);
      const fee = Number(tx.platform_fee_vnd ?? Math.max(0, gross - net));

      creatorNetRevenueVnd += net;
      grossRevenueVnd += gross;
      platformFeeVnd += fee;

      const storyId = tx.story_id as string | null;

      if (storyId) {
        revenueByStory.set(storyId, (revenueByStory.get(storyId) ?? 0) + net);
      }

      if (tx.type === "author_tip" || tx.type === "virtual_gift" || tx.source === "tip") {
        tipsReceivedVnd += net;
      }

      if (tx.type === "chapter_unlock" || tx.type === "story_unlock" || tx.source === "unlock") {
        paidUnlockCount += 1;
        paidUnlockRevenueVnd += net;
      }
    }
  }

  const storyRows: StudioStoryMonetizationRow[] = (stories ?? []).map((story) => {
    const paidChapterCount = paidCountByStory.get(story.id) ?? 0;
    const adminFreeFloor = config.paidChapterFreeChaptersRequired;
    const inferredFree = freeChaptersByStory.get(story.id) ?? adminFreeFloor;

    return {
      storyId: story.id,
      title: story.title,
      slug: story.slug,
      monetizationEnabled: paidChapterCount > 0,
      paidChapterCount,
      totalChapterCount: totalChaptersByStory.get(story.id) ?? 0,
      freeChaptersCount: Math.max(inferredFree, adminFreeFloor),
      defaultCoinPrice:
        priceByStory.get(story.id) ?? config.paidChapterDefaultCoinPrice,
      revenueVnd: formatVnd(revenueByStory.get(story.id) ?? 0)
    };
  });

  const wallet = walletResult.data;

  return {
    gateStatus,
    canConfigure,
    config,
    overview: {
      availableRevenueVnd: formatVnd(wallet?.available_revenue_vnd ?? 0),
      pendingRevenueVnd: formatVnd(wallet?.pending_revenue_vnd ?? 0),
      lockedRevenueVnd: formatVnd(wallet?.locked_revenue_vnd ?? 0),
      totalEarnedVnd: formatVnd(wallet?.total_earned_vnd ?? 0),
      totalWithdrawnVnd: formatVnd(wallet?.total_withdrawn_vnd ?? 0),
      tipsReceivedVnd: formatVnd(tipsReceivedVnd),
      paidUnlockCount,
      paidUnlockRevenueVnd: formatVnd(paidUnlockRevenueVnd),
      grossRevenueVnd: formatVnd(grossRevenueVnd || wallet?.total_earned_vnd || 0),
      platformFeeVnd: formatVnd(platformFeeVnd),
      creatorNetRevenueVnd: formatVnd(
        creatorNetRevenueVnd ||
          (wallet?.available_revenue_vnd ?? 0) + (wallet?.pending_revenue_vnd ?? 0)
      ),
      hasWallet: Boolean(wallet)
    },
    eligibility,
    profile,
    stories: storyRows,
    wallet,
    payoutAccounts: payoutAccounts.data,
    payoutRequests: payoutRequests.data,
    error: profileResult.error
  };
}
