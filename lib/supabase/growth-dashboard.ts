import { createClient } from "@/lib/supabase/server";
import type {
  CreatorGrowthMetrics,
  GrowthDashboardData,
  GrowthFunnelStep,
  GrowthKpis,
  GrowthRange,
  GrowthRates,
  NotificationMetrics,
  ReferralMetrics,
  RevenueMetrics,
  TopAuthorMetric,
  TopStoryMetric
} from "@/types/growth";

const validRanges = new Set<GrowthRange>(["today", "7d", "30d", "all"]);

function getRangeStart(range: GrowthRange) {
  const now = new Date();
  if (range === "all") return null;
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  if (range === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

function safeRate(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return numerator / denominator;
}

function applyDateFilter<Query>(query: Query, rangeStart: string | null): Query {
  if (!rangeStart) return query;
  return (query as { gte: (column: string, value: string) => Query }).gte(
    "created_at",
    rangeStart
  );
}

function buildEmpty(range: GrowthRange): GrowthDashboardData {
  const emptyKpis: GrowthKpis = {
    newUsers: 0,
    dau: 0,
    wau: 0,
    mau: 0,
    sessions: 0,
    swipeItemViews: 0,
    storyViews: 0,
    chapterOpens: 0,
    chapterCompletions: 0,
    readMoreClicks: 0,
    likes: 0,
    saves: 0,
    follows: 0,
    comments: 0,
    shares: 0,
    newStories: 0,
    newChapters: 0,
    activeAuthors: 0,
    activeReaders: 0
  };
  const emptyRates: GrowthRates = {
    readMoreRate: 0,
    chapterCompletionRate: 0,
    commentRate: 0,
    shareRate: 0,
    followRate: 0,
    onboardingCompletionRate: 0,
    creatorPublishRate: 0
  };
  const emptyCreator: CreatorGrowthMetrics = {
    newAuthors: 0,
    activeAuthors: 0,
    storiesPublished: 0,
    chaptersPublished: 0,
    averageChaptersPerActiveAuthor: 0,
    authorsWithComments: 0,
    authorsReturningThisWeek: 0
  };
  const emptyReferral: ReferralMetrics = {
    referralLinkOpens: 0,
    referralSignups: 0,
    topReferrers: [],
    usersByUtmSource: [],
    signupsByUtmCampaign: [],
    activationsBySource: []
  };
  const emptyNotification: NotificationMetrics = {
    notificationsCreated: 0,
    notificationsRead: 0,
    notificationClicks: 0,
    unreadTotal: 0
  };
  const emptyRevenue: RevenueMetrics = {
    hasRevenueData: false,
    grossRevenue: 0,
    netCreatorRevenue: 0,
    paidReaders: 0,
    payingConversion: 0,
    topEarningAuthors: [],
    topSupporters: []
  };
  return {
    range,
    kpis: emptyKpis,
    onboardingFunnel: [],
    swipeFunnel: [],
    creatorFunnel: [],
    rates: emptyRates,
    creatorMetrics: emptyCreator,
    topStoriesByViews: [],
    topStoriesByReadMore: [],
    topStoriesByShares: [],
    topAuthorsByGrowth: [],
    reportedContentCount: 0,
    referral: emptyReferral,
    notifications: emptyNotification,
    revenue: emptyRevenue,
    error: null
  };
}

type EventCountMap = Record<string, number>;

function asJsonRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, unknown>;
}

function getRelationField(
  relation: unknown,
  key: "pen_name" | "user_id"
): string | null {
  if (Array.isArray(relation)) {
    const value = relation[0];
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    return typeof record[key] === "string" ? record[key] : null;
  }
  if (!relation || typeof relation !== "object") return null;
  const record = relation as Record<string, unknown>;
  return typeof record[key] === "string" ? record[key] : null;
}

export function getGrowthRange(value: string | undefined): GrowthRange {
  if (value && validRanges.has(value as GrowthRange)) {
    return value as GrowthRange;
  }
  return "7d";
}

async function fetchEventCounts(rangeStart: string | null, eventNames: string[]) {
  const supabase = await createClient();
  const query = applyDateFilter(
    supabase
      .from("analytics_events")
      .select("event_name")
      .in("event_name", eventNames),
    rangeStart
  );
  const { data, error } = await query;
  if (error) throw error;
  const counts: EventCountMap = {};
  for (const name of eventNames) counts[name] = 0;
  for (const row of data ?? []) {
    counts[row.event_name] = (counts[row.event_name] ?? 0) + 1;
  }
  return counts;
}

async function fetchDistinctUsersForEvents(rangeStart: string | null, eventNames: string[]) {
  const supabase = await createClient();
  const query = applyDateFilter(
    supabase
      .from("analytics_events")
      .select("user_id")
      .in("event_name", eventNames)
      .not("user_id", "is", null),
    rangeStart
  );
  const { data, error } = await query;
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.user_id)).size;
}

async function fetchTopStoriesByEvent(input: {
  rangeStart: string | null;
  eventNames: string[];
  fromMetadataStoryId?: boolean;
}): Promise<TopStoryMetric[]> {
  const supabase = await createClient();
  const query = applyDateFilter(
    supabase
      .from("analytics_events")
      .select("target_id, properties, metadata")
      .in("event_name", input.eventNames),
    input.rangeStart
  );
  const { data, error } = await query;
  if (error) throw error;

  const counter = new Map<string, number>();
  for (const row of data ?? []) {
    let storyId = row.target_id as string | null;
    if (input.fromMetadataStoryId) {
      const properties = asJsonRecord(row.properties);
      const metadata = asJsonRecord((row as { metadata?: unknown }).metadata);
      const maybeStoryId =
        (typeof properties.story_id === "string" ? properties.story_id : null) ??
        (typeof metadata.story_id === "string" ? metadata.story_id : null);
      storyId = maybeStoryId ?? storyId;
    }
    if (!storyId) continue;
    counter.set(storyId, (counter.get(storyId) ?? 0) + 1);
  }

  const storyIds = [...counter.keys()].slice(0, 20);
  if (!storyIds.length) return [];

  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, slug, creator_profiles(pen_name)")
    .in("id", storyIds);

  const storyMap = new Map(
    (stories ?? []).map((item) => [
      item.id,
      {
        title: item.title,
        slug: item.slug,
        creatorName: getRelationField(
          (item as { creator_profiles?: unknown }).creator_profiles,
          "pen_name"
        )
      }
    ])
  );

  return [...counter.entries()]
    .map(([storyId, value]) => {
      const meta = storyMap.get(storyId);
      if (!meta) return null;
      return {
        storyId,
        storyTitle: meta.title,
        storySlug: meta.slug,
        creatorName: meta.creatorName,
        value
      };
    })
    .filter((item): item is TopStoryMetric => Boolean(item))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export async function getGrowthDashboardData(range: GrowthRange): Promise<GrowthDashboardData> {
  const fallback = buildEmpty(range);
  const rangeStart = getRangeStart(range);
  const now = Date.now();
  const dayStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const prevWeekStart = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const supabase = await createClient();
    const eventNames = [
      "swipe_item_viewed",
      "feed_impression",
      "story_viewed",
      "open_story",
      "chapter_opened",
      "chapter_completed",
      "complete_chap",
      "swipe_read_more_clicked",
      "feed_read_more",
      "swipe_like_clicked",
      "feed_save",
      "swipe_save_clicked",
      "follow_creator",
      "swipe_follow_author_clicked",
      "comment_created",
      "swipe_comment_opened",
      "share_clicked",
      "swipe_share_clicked",
      "feed_share",
      "onboarding_started",
      "role_selected",
      "onboarding_role_selected",
      "genres_selected",
      "onboarding_genres_selected",
      "onboarding_completed",
      "onboarding_skipped",
      "swipe_feed_viewed",
      "creator_dashboard_viewed",
      "story_created",
      "story_published",
      "chapter_created",
      "chapter_published",
      "referral_link_opened",
      "referral_signup_completed",
      "activation_completed",
      "notification_clicked",
      "session_started"
    ];

    const [
      eventCounts,
      newUsersResult,
      newStoriesResult,
      newChaptersResult,
      publishedStoriesResult,
      publishedChaptersResult,
      newAuthorsResult,
      reportsResult,
      notificationsCreatedResult,
      notificationsReadResult,
      unreadNotificationsResult,
      activeReadersCount,
      dauCount,
      wauCount,
      mauCount,
      activeAuthorsCurrentWeekResult,
      activeAuthorsPrevWeekResult,
      topStoriesByViews,
      topStoriesByReadMore,
      topStoriesByShares
    ] = await Promise.all([
      fetchEventCounts(rangeStart, eventNames),
      applyDateFilter(
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        supabase.from("stories").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        supabase.from("episodes").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .in("status", ["approved", "published"]),
        rangeStart
      ),
      applyDateFilter(
        supabase
          .from("episodes")
          .select("id", { count: "exact", head: true })
          .in("status", ["approved", "published"]),
        rangeStart
      ),
      applyDateFilter(
        supabase
          .from("creator_profiles")
          .select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        supabase.from("reports").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        supabase.from("notifications").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .not("read_at", "is", null),
        rangeStart
      ),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
      fetchDistinctUsersForEvents(rangeStart, [
        "swipe_item_viewed",
        "feed_impression",
        "story_viewed",
        "open_story",
        "chapter_opened",
        "chapter_completed",
        "complete_chap",
        "swipe_read_more_clicked",
        "feed_read_more"
      ]),
      fetchDistinctUsersForEvents(dayStart, ["session_started", "app_opened", "page_viewed"]),
      fetchDistinctUsersForEvents(weekStart, ["session_started", "app_opened", "page_viewed"]),
      fetchDistinctUsersForEvents(monthStart, ["session_started", "app_opened", "page_viewed"]),
      fetchDistinctUsersForEvents(weekStart, [
        "creator_dashboard_viewed",
        "story_created",
        "chapter_created",
        "story_published",
        "chapter_published"
      ]),
      fetchDistinctUsersForEvents(prevWeekStart, [
        "creator_dashboard_viewed",
        "story_created",
        "chapter_created",
        "story_published",
        "chapter_published"
      ]),
      fetchTopStoriesByEvent({
        rangeStart,
        eventNames: ["open_story", "story_viewed"]
      }),
      fetchTopStoriesByEvent({
        rangeStart,
        eventNames: ["feed_read_more", "swipe_read_more_clicked"],
        fromMetadataStoryId: true
      }),
      fetchTopStoriesByEvent({
        rangeStart,
        eventNames: ["share_clicked", "swipe_share_clicked", "feed_share"],
        fromMetadataStoryId: true
      })
    ]);

    const activeAuthors = await fetchDistinctUsersForEvents(rangeStart, [
      "creator_dashboard_viewed",
      "story_created",
      "chapter_created",
      "story_published",
      "chapter_published"
    ]);

    const commentRowsResult = await applyDateFilter(
      supabase
        .from("comments")
        .select("story_id")
        .eq("status", "visible")
        .not("story_id", "is", null),
      rangeStart
    );
    const commentStoryIds = [...new Set((commentRowsResult.data ?? []).map((x) => x.story_id))];
    const storyAuthorResult =
      commentStoryIds.length > 0
        ? await supabase
            .from("stories")
            .select("id, creator_profiles(user_id, id)")
            .in("id", commentStoryIds)
        : { data: [] as Array<{ id: string; creator_profiles: { user_id: string; id: string } }> };
    const authorsWithComments = new Set(
      (storyAuthorResult.data ?? []).map((item) =>
        getRelationField(
          (item as { creator_profiles?: unknown }).creator_profiles,
          "user_id"
        )
      )
    );

    const activeAuthorsCurrentWeek = activeAuthorsCurrentWeekResult;
    const activeAuthorsPrevWeek = activeAuthorsPrevWeekResult;
    const authorsReturningThisWeek = Math.min(
      activeAuthorsCurrentWeek,
      activeAuthorsPrevWeek
    );

    const swipeItemViews =
      (eventCounts.swipe_item_viewed ?? 0) + (eventCounts.feed_impression ?? 0);
    const storyViews = (eventCounts.story_viewed ?? 0) + (eventCounts.open_story ?? 0);
    const chapterOpens = eventCounts.chapter_opened ?? 0;
    const chapterCompletions =
      (eventCounts.chapter_completed ?? 0) + (eventCounts.complete_chap ?? 0);
    const readMoreClicks =
      (eventCounts.swipe_read_more_clicked ?? 0) + (eventCounts.feed_read_more ?? 0);
    const likes = eventCounts.swipe_like_clicked ?? 0;
    const saves = (eventCounts.feed_save ?? 0) + (eventCounts.swipe_save_clicked ?? 0);
    const follows =
      (eventCounts.follow_creator ?? 0) + (eventCounts.swipe_follow_author_clicked ?? 0);
    const comments =
      (eventCounts.comment_created ?? 0) + (eventCounts.swipe_comment_opened ?? 0);
    const shares =
      (eventCounts.share_clicked ?? 0) +
      (eventCounts.swipe_share_clicked ?? 0) +
      (eventCounts.feed_share ?? 0);

    const kpis: GrowthKpis = {
      newUsers: newUsersResult.count ?? 0,
      dau: dauCount,
      wau: wauCount,
      mau: mauCount,
      sessions: eventCounts.session_started ?? 0,
      swipeItemViews,
      storyViews,
      chapterOpens,
      chapterCompletions,
      readMoreClicks,
      likes,
      saves,
      follows,
      comments,
      shares,
      newStories: newStoriesResult.count ?? 0,
      newChapters: newChaptersResult.count ?? 0,
      activeAuthors,
      activeReaders: activeReadersCount
    };

    const onboardingFunnel: GrowthFunnelStep[] = [
      { key: "onboarding_started", label: "Onboarding started", value: eventCounts.onboarding_started ?? 0 },
      {
        key: "role_selected",
        label: "Role selected",
        value: (eventCounts.onboarding_role_selected ?? 0) + (eventCounts.role_selected ?? 0)
      },
      {
        key: "genres_selected",
        label: "Genres selected",
        value: (eventCounts.onboarding_genres_selected ?? 0) + (eventCounts.genres_selected ?? 0)
      },
      { key: "onboarding_completed", label: "Onboarding completed", value: eventCounts.onboarding_completed ?? 0 },
      { key: "onboarding_skipped", label: "Onboarding skipped", value: eventCounts.onboarding_skipped ?? 0 }
    ];
    const swipeFunnel: GrowthFunnelStep[] = [
      { key: "swipe_feed_viewed", label: "Swipe feed viewed", value: eventCounts.swipe_feed_viewed ?? 0 },
      { key: "swipe_item_viewed", label: "Swipe item viewed", value: swipeItemViews },
      { key: "swipe_read_more_clicked", label: "Swipe read more clicked", value: readMoreClicks },
      { key: "story_viewed", label: "Story viewed", value: storyViews },
      { key: "chapter_opened", label: "Chapter opened", value: chapterOpens },
      { key: "chapter_completed", label: "Chapter completed", value: chapterCompletions }
    ];
    const creatorFunnel: GrowthFunnelStep[] = [
      { key: "creator_dashboard_viewed", label: "Creator dashboard viewed", value: eventCounts.creator_dashboard_viewed ?? 0 },
      { key: "story_created", label: "Story created", value: eventCounts.story_created ?? 0 },
      { key: "story_published", label: "Story published", value: eventCounts.story_published ?? 0 },
      { key: "chapter_created", label: "Chapter created", value: eventCounts.chapter_created ?? 0 },
      { key: "chapter_published", label: "Chapter published", value: eventCounts.chapter_published ?? 0 }
    ];

    const rates: GrowthRates = {
      readMoreRate: safeRate(readMoreClicks, swipeItemViews),
      chapterCompletionRate: safeRate(chapterCompletions, chapterOpens),
      commentRate: safeRate(comments, chapterOpens || storyViews),
      shareRate: safeRate(shares, storyViews || swipeItemViews),
      followRate: safeRate(follows, storyViews),
      onboardingCompletionRate: safeRate(
        eventCounts.onboarding_completed ?? 0,
        eventCounts.onboarding_started ?? 0
      ),
      creatorPublishRate: safeRate(
        (eventCounts.story_published ?? 0) + (eventCounts.chapter_published ?? 0),
        (eventCounts.story_created ?? 0) + (eventCounts.chapter_created ?? 0)
      )
    };

    const creatorMetrics: CreatorGrowthMetrics = {
      newAuthors: newAuthorsResult.count ?? 0,
      activeAuthors,
      storiesPublished: publishedStoriesResult.count ?? 0,
      chaptersPublished: publishedChaptersResult.count ?? 0,
      averageChaptersPerActiveAuthor: safeRate(
        publishedChaptersResult.count ?? 0,
        activeAuthors || 1
      ),
      authorsWithComments: authorsWithComments.size,
      authorsReturningThisWeek
    };

    const referralRowsQuery = await applyDateFilter(
      supabase
        .from("analytics_events")
        .select("event_name, properties, metadata")
        .in("event_name", [
          "referral_link_opened",
          "referral_signup_completed",
          "activation_completed"
        ]),
      rangeStart
    );
    const topReferrerCounter = new Map<string, number>();
    const utmSourceCounter = new Map<string, number>();
    const utmCampaignCounter = new Map<string, number>();
    const activationBySourceCounter = new Map<string, number>();
    for (const row of referralRowsQuery.data ?? []) {
      const properties = asJsonRecord(row.properties);
      const metadata = asJsonRecord((row as { metadata?: unknown }).metadata);
      const merged = { ...metadata, ...properties };
      const referrerId =
        typeof merged.referrer_id === "string" ? merged.referrer_id : undefined;
      if (referrerId) topReferrerCounter.set(referrerId, (topReferrerCounter.get(referrerId) ?? 0) + 1);
      const source = typeof merged.utm_source === "string" ? merged.utm_source : undefined;
      if (source) utmSourceCounter.set(source, (utmSourceCounter.get(source) ?? 0) + 1);
      const campaign =
        typeof merged.utm_campaign === "string" ? merged.utm_campaign : undefined;
      if (campaign) utmCampaignCounter.set(campaign, (utmCampaignCounter.get(campaign) ?? 0) + 1);
      if (row.event_name === "activation_completed" && source) {
        activationBySourceCounter.set(
          source,
          (activationBySourceCounter.get(source) ?? 0) + 1
        );
      }
    }

    const referral: ReferralMetrics = {
      referralLinkOpens: eventCounts.referral_link_opened ?? 0,
      referralSignups: eventCounts.referral_signup_completed ?? 0,
      topReferrers: [...topReferrerCounter.entries()]
        .map(([referrerId, value]) => ({ referrerId, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      usersByUtmSource: [...utmSourceCounter.entries()]
        .map(([source, value]) => ({ source, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      signupsByUtmCampaign: [...utmCampaignCounter.entries()]
        .map(([campaign, value]) => ({ campaign, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      activationsBySource: [...activationBySourceCounter.entries()]
        .map(([source, value]) => ({ source, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    };

    const notifications: NotificationMetrics = {
      notificationsCreated: notificationsCreatedResult.count ?? 0,
      notificationsRead: notificationsReadResult.count ?? 0,
      notificationClicks: eventCounts.notification_clicked ?? 0,
      unreadTotal: unreadNotificationsResult.count ?? 0
    };

    const transactionsResult = await applyDateFilter(
      supabase
        .from("creator_transactions")
        .select("author_id, user_id, amount, creator_net_amount"),
      rangeStart
    );
    const txRows = transactionsResult.data ?? [];
    const hasRevenueData = txRows.length > 0;
    const grossRevenue = txRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const netCreatorRevenue = txRows.reduce(
      (sum, row) => sum + Number(row.creator_net_amount ?? 0),
      0
    );
    const paidReaders = new Set(txRows.map((row) => row.user_id)).size;
    const payingConversion = safeRate(paidReaders, mauCount || 1);
    const authorRevenueMap = new Map<string, number>();
    for (const row of txRows) {
      if (!row.author_id) continue;
      authorRevenueMap.set(
        row.author_id,
        (authorRevenueMap.get(row.author_id) ?? 0) + Number(row.amount ?? 0)
      );
    }
    const topAuthorRevenueIds = [...authorRevenueMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);
    const authorRows =
      topAuthorRevenueIds.length > 0
        ? await supabase
            .from("creator_profiles")
            .select("id, pen_name")
            .in("id", topAuthorRevenueIds)
        : { data: [] as Array<{ id: string; pen_name: string }> };
    const authorNameMap = new Map((authorRows.data ?? []).map((x) => [x.id, x.pen_name]));

    const supporterMap = new Map<string, number>();
    for (const row of txRows) {
      supporterMap.set(
        row.user_id,
        (supporterMap.get(row.user_id) ?? 0) + Number(row.amount ?? 0)
      );
    }
    const topSupporterIds = [...supporterMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((x) => x[0]);
    const supporterRows =
      topSupporterIds.length > 0
        ? await supabase.from("profiles").select("id, display_name, username").in("id", topSupporterIds)
        : { data: [] as Array<{ id: string; display_name: string | null; username: string | null }> };
    const supporterNameMap = new Map(
      (supporterRows.data ?? []).map((x) => [x.id, x.display_name ?? x.username ?? x.id])
    );

    const revenue: RevenueMetrics = {
      hasRevenueData,
      grossRevenue,
      netCreatorRevenue,
      paidReaders,
      payingConversion,
      topEarningAuthors: [...authorRevenueMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([authorId, gross]) => ({
          authorId,
          penName: authorNameMap.get(authorId) ?? "Unknown author",
          grossRevenue: gross
        })),
      topSupporters: [...supporterMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, totalSupported]) => ({
          userId,
          displayName: supporterNameMap.get(userId) ?? "Unknown user",
          totalSupported
        }))
    };

    const topAuthorsByGrowth: TopAuthorMetric[] = await (async () => {
      const query = await applyDateFilter(
        supabase
          .from("analytics_events")
          .select("target_id")
          .in("event_name", ["open_story", "story_viewed"])
          .eq("target_type", "story"),
        rangeStart
      );
      const storyViewMap = new Map<string, number>();
      for (const row of query.data ?? []) {
        const storyId = row.target_id as string | null;
        if (!storyId) continue;
        storyViewMap.set(storyId, (storyViewMap.get(storyId) ?? 0) + 1);
      }
      const topStories = [...storyViewMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([id]) => id);
      if (!topStories.length) return [];
      const storyRows = await supabase
        .from("stories")
        .select("id, creator_profiles(id, pen_name)")
        .in("id", topStories);
      const authorMap = new Map<string, { penName: string; value: number }>();
      for (const story of storyRows.data ?? []) {
        const creator = Array.isArray(story.creator_profiles)
          ? story.creator_profiles[0]
          : story.creator_profiles;
        const creatorId =
          creator && typeof creator === "object" && "id" in creator
            ? ((creator as { id?: string }).id ?? null)
            : null;
        if (!creatorId) continue;
        const views = storyViewMap.get(story.id) ?? 0;
        const prev = authorMap.get(creatorId);
        authorMap.set(creatorId, {
          penName:
            (creator &&
              typeof creator === "object" &&
              "pen_name" in creator &&
              typeof (creator as { pen_name?: unknown }).pen_name === "string"
              ? (creator as { pen_name: string }).pen_name
              : "Unknown author"),
          value: (prev?.value ?? 0) + views
        });
      }
      return [...authorMap.entries()]
        .map(([authorId, payload]) => ({
          authorId,
          penName: payload.penName,
          value: payload.value
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    })();

    return {
      range,
      kpis,
      onboardingFunnel,
      swipeFunnel,
      creatorFunnel,
      rates,
      creatorMetrics,
      topStoriesByViews,
      topStoriesByReadMore,
      topStoriesByShares,
      topAuthorsByGrowth,
      reportedContentCount: reportsResult.count ?? 0,
      referral,
      notifications,
      revenue,
      error: null
    };
  } catch (error) {
    return {
      ...fallback,
      error:
        error instanceof Error
          ? error.message
          : "Khong the tai growth dashboard."
    };
  }
}
