import "server-only";

import { sql } from "drizzle-orm";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { detectPotentialSpamContent } from "@/lib/moderation/spam-heuristics";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  STORY_REVIEW_BODY_MAX,
  STORY_REVIEW_MIN_READ_PROGRESS_PERCENT,
  STORY_REVIEW_PAGE_SIZE,
  STORY_REVIEW_TITLE_MAX
} from "@/lib/reviews/story-review-config";
import { getStoryReadingProgress } from "@/lib/stories/get-story-reading-progress";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { canViewPublicStory } from "@/lib/visibility/contentVisibility";
import type {
  StoryReviewInput,
  StoryReviewSort,
  StoryReviewsPageResult,
  StoryReviewStatsView,
  StoryReviewView,
  UpsertStoryReviewResult,
  AdminStoryReviewRow
} from "@/types/story-review";

type ReviewRow = {
  id: string;
  story_id: string;
  reviewer_profile_id: string;
  overall_rating: number;
  plot_score: number;
  character_score: number;
  writing_style_score: number;
  worldbuilding_score: number;
  title: string | null;
  body: string | null;
  status: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  display_name: string | null;
  username: string | null;
};

type StatsRow = {
  story_id: string;
  review_count: number;
  avg_overall: string | null;
  avg_plot: string | null;
  avg_character: string | null;
  avg_writing_style: string | null;
  avg_worldbuilding: string | null;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
  updated_at: string | null;
};

const EMPTY_STATS = (storyId: string): StoryReviewStatsView => ({
  storyId,
  reviewCount: 0,
  avgOverall: null,
  avgPlot: null,
  avgCharacter: null,
  avgWritingStyle: null,
  avgWorldbuilding: null,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  updatedAt: null
});

function toRating(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }
  return parsed;
}

function toOptionalNumber(value: string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapStatsRow(row: StatsRow | undefined, storyId: string): StoryReviewStatsView {
  if (!row || row.review_count <= 0) {
    return EMPTY_STATS(storyId);
  }

  return {
    storyId: row.story_id,
    reviewCount: row.review_count,
    avgOverall: toOptionalNumber(row.avg_overall),
    avgPlot: toOptionalNumber(row.avg_plot),
    avgCharacter: toOptionalNumber(row.avg_character),
    avgWritingStyle: toOptionalNumber(row.avg_writing_style),
    avgWorldbuilding: toOptionalNumber(row.avg_worldbuilding),
    ratingDistribution: {
      1: row.rating_1_count ?? 0,
      2: row.rating_2_count ?? 0,
      3: row.rating_3_count ?? 0,
      4: row.rating_4_count ?? 0,
      5: row.rating_5_count ?? 0
    },
    updatedAt: row.updated_at
  };
}

function mapReviewRow(row: ReviewRow, viewerProfileId?: string | null): StoryReviewView {
  return {
    id: row.id,
    storyId: row.story_id,
    overallRating: row.overall_rating,
    plotScore: row.plot_score,
    characterScore: row.character_score,
    writingStyleScore: row.writing_style_score,
    worldbuildingScore: row.worldbuilding_score,
    title: row.title,
    body: row.body,
    helpfulCount: row.helpful_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewerDisplayName: row.display_name,
    reviewerUsername: row.username?.trim().toLowerCase() ?? null,
    isOwnReview: Boolean(viewerProfileId && viewerProfileId === row.reviewer_profile_id),
    userMarkedHelpful: false
  };
}

function sortClause(sort: StoryReviewSort) {
  switch (sort) {
    case "highest":
      return sql`r.overall_rating desc, r.created_at desc`;
    case "lowest":
      return sql`r.overall_rating asc, r.created_at desc`;
    case "helpful":
      return sql`r.helpful_count desc, r.created_at desc`;
    default:
      return sql`r.created_at desc`;
  }
}

async function loadStoryAccess(storyId: string) {
  const result = await db.execute(sql`
    select id, creator_id, status, visibility
    from public.stories
    where id = ${storyId}::uuid
    limit 1
  `);

  const row = result.rows[0] as
    | {
        id: string;
        creator_id: string | null;
        status: string;
        visibility: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  const creatorUserId = row.creator_id
    ? (
        (
          await db.execute(sql`
            select user_id
            from public.creator_profiles
            where id = ${row.creator_id}::uuid
            limit 1
          `)
        ).rows[0] as { user_id?: string } | undefined
      )?.user_id ?? null
    : null;

  return {
    storyId: row.id,
    creatorUserId,
    isPublic: canViewPublicStory(row.status, row.visibility)
  };
}

export async function refreshStoryReviewStats(storyId: string) {
  const countResult = await db.execute(sql`
    select count(*)::int as total
    from public.story_reviews
    where story_id = ${storyId}::uuid
      and status = 'visible'
  `);

  const total = Number((countResult.rows[0] as { total?: number })?.total ?? 0);
  if (total === 0) {
    await db.execute(sql`
      delete from public.story_review_stats
      where story_id = ${storyId}::uuid
    `);
    return;
  }

  await db.execute(sql`
    insert into public.story_review_stats (
      story_id,
      review_count,
      avg_overall,
      avg_plot,
      avg_character,
      avg_writing_style,
      avg_worldbuilding,
      rating_1_count,
      rating_2_count,
      rating_3_count,
      rating_4_count,
      rating_5_count,
      updated_at
    )
    select
      ${storyId}::uuid,
      count(*)::int,
      round(avg(overall_rating)::numeric, 2),
      round(avg(plot_score)::numeric, 2),
      round(avg(character_score)::numeric, 2),
      round(avg(writing_style_score)::numeric, 2),
      round(avg(worldbuilding_score)::numeric, 2),
      count(*) filter (where overall_rating = 1)::int,
      count(*) filter (where overall_rating = 2)::int,
      count(*) filter (where overall_rating = 3)::int,
      count(*) filter (where overall_rating = 4)::int,
      count(*) filter (where overall_rating = 5)::int,
      now()
    from public.story_reviews
    where story_id = ${storyId}::uuid
      and status = 'visible'
    on conflict (story_id) do update set
      review_count = excluded.review_count,
      avg_overall = excluded.avg_overall,
      avg_plot = excluded.avg_plot,
      avg_character = excluded.avg_character,
      avg_writing_style = excluded.avg_writing_style,
      avg_worldbuilding = excluded.avg_worldbuilding,
      rating_1_count = excluded.rating_1_count,
      rating_2_count = excluded.rating_2_count,
      rating_3_count = excluded.rating_3_count,
      rating_4_count = excluded.rating_4_count,
      rating_5_count = excluded.rating_5_count,
      updated_at = excluded.updated_at
  `);
}

export async function getStoryReviewStats(storyId: string): Promise<StoryReviewStatsView> {
  try {
    const result = await db.execute(sql`
      select *
      from public.story_review_stats
      where story_id = ${storyId}::uuid
      limit 1
    `);

    return mapStatsRow(result.rows[0] as StatsRow | undefined, storyId);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return EMPTY_STATS(storyId);
    }
    throw error;
  }
}

async function attachHelpfulFlags(
  reviews: StoryReviewView[],
  storyId: string,
  viewerProfileId?: string | null
) {
  if (!viewerProfileId || reviews.length === 0) {
    return reviews;
  }

  const result = await db.execute(sql`
    select hv.review_id
    from public.story_review_helpful_votes hv
    inner join public.story_reviews r on r.id = hv.review_id
    where hv.profile_id = ${viewerProfileId}::uuid
      and r.story_id = ${storyId}::uuid
  `);

  const voted = new Set(
    (result.rows as Array<{ review_id: string }>).map((row) => row.review_id)
  );

  return reviews.map((review) => ({
    ...review,
    userMarkedHelpful: voted.has(review.id)
  }));
}

export async function getStoryReviews(
  storyId: string,
  options?: {
    page?: number;
    pageSize?: number;
    sort?: StoryReviewSort;
    viewerProfileId?: string | null;
  }
): Promise<StoryReviewsPageResult> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? STORY_REVIEW_PAGE_SIZE;
  const sort = options?.sort ?? "newest";
  const offset = (page - 1) * pageSize;

  const access = await loadStoryAccess(storyId);
  if (!access?.isPublic) {
    return {
      reviews: [],
      page,
      pageSize,
      totalCount: 0,
      totalPages: 0,
      sort
    };
  }

  const countResult = await db.execute(sql`
    select count(*)::int as total
    from public.story_reviews r
    where r.story_id = ${storyId}::uuid
      and r.status = 'visible'
  `);

  const totalCount = Number((countResult.rows[0] as { total?: number })?.total ?? 0);
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

  const listResult = await db.execute(sql`
    select
      r.id,
      r.story_id,
      r.reviewer_profile_id,
      r.overall_rating,
      r.plot_score,
      r.character_score,
      r.writing_style_score,
      r.worldbuilding_score,
      r.title,
      r.body,
      r.status,
      r.helpful_count,
      r.created_at,
      r.updated_at,
      p.display_name,
      p.username
    from public.story_reviews r
    inner join public.profiles p on p.id = r.reviewer_profile_id
    where r.story_id = ${storyId}::uuid
      and r.status = 'visible'
    order by ${sortClause(sort)}
    limit ${pageSize}
    offset ${offset}
  `);

  const reviews = (listResult.rows as ReviewRow[]).map((row) =>
    mapReviewRow(row, options?.viewerProfileId)
  );

  return {
    reviews: await attachHelpfulFlags(reviews, storyId, options?.viewerProfileId),
    page,
    pageSize,
    totalCount,
    totalPages,
    sort
  };
}

export async function getMyStoryReview(
  storyId: string,
  profileId?: string | null
): Promise<StoryReviewView | null> {
  if (!profileId) {
    return null;
  }

  const result = await db.execute(sql`
    select
      r.id,
      r.story_id,
      r.reviewer_profile_id,
      r.overall_rating,
      r.plot_score,
      r.character_score,
      r.writing_style_score,
      r.worldbuilding_score,
      r.title,
      r.body,
      r.status,
      r.helpful_count,
      r.created_at,
      r.updated_at,
      p.display_name,
      p.username
    from public.story_reviews r
    inner join public.profiles p on p.id = r.reviewer_profile_id
    where r.story_id = ${storyId}::uuid
      and r.reviewer_profile_id = ${profileId}::uuid
      and r.status <> 'deleted'
    limit 1
  `);

  const row = result.rows[0] as ReviewRow | undefined;
  if (!row) {
    return null;
  }

  const [review] = await attachHelpfulFlags(
    [mapReviewRow(row, profileId)],
    storyId,
    profileId
  );
  return review ?? null;
}

function validateReviewInput(input: StoryReviewInput): string | null {
  const scores = [
    toRating(input.overallRating),
    toRating(input.plotScore),
    toRating(input.characterScore),
    toRating(input.writingStyleScore),
    toRating(input.worldbuildingScore)
  ];

  if (scores.some((score) => score == null)) {
    return "Mỗi tiêu chí phải từ 1 đến 5 sao.";
  }

  const title = input.title?.trim() ?? "";
  if (title.length > STORY_REVIEW_TITLE_MAX) {
    return `Tiêu đề tối đa ${STORY_REVIEW_TITLE_MAX} ký tự.`;
  }

  const body = input.body?.trim() ?? "";
  if (body.length > STORY_REVIEW_BODY_MAX) {
    return `Nội dung tối đa ${STORY_REVIEW_BODY_MAX} ký tự.`;
  }

  if (body || title) {
    const spam = detectPotentialSpamContent({
      title,
      content: body
    });
    if (spam.suspected) {
      return "Nội dung đánh giá có dấu hiệu spam.";
    }
  }

  return null;
}

async function assertCanReviewStory(storyId: string, profileId: string) {
  const access = await loadStoryAccess(storyId);
  if (!access?.isPublic) {
    return { ok: false as const, error: "Truyện này chưa công khai." };
  }

  if (access.creatorUserId && access.creatorUserId === profileId) {
    return {
      ok: false as const,
      error: "Bạn không thể đánh giá truyện của chính mình."
    };
  }

  if (STORY_REVIEW_MIN_READ_PROGRESS_PERCENT > 0) {
    const progress = await getStoryReadingProgress(storyId, profileId);
    if (!progress || progress.progressPercent < STORY_REVIEW_MIN_READ_PROGRESS_PERCENT) {
      return {
        ok: false as const,
        error: "Bạn cần đọc thêm trước khi đánh giá truyện này."
      };
    }
  }

  return { ok: true as const, access };
}

export async function upsertStoryReview(
  storyId: string,
  input: StoryReviewInput
): Promise<UpsertStoryReviewResult> {
  const validationError = validateReviewInput(input);
  if (validationError) {
    return { ok: false, error: validationError, loginRequired: false, review: null };
  }

  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    return { ok: false, error: null, loginRequired: true, review: null };
  }

  try {
    await assertActionAccess("comment.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message, loginRequired: false, review: null };
    }
    throw error;
  }

  const restriction = await assertNotRestricted(
    user.id,
    "comment_block",
    "Bạn đang bị hạn chế đánh giá. Xem /me/account-status."
  );
  if (!restriction.ok) {
    return { ok: false, error: restriction.error, loginRequired: false, review: null };
  }

  const canReview = await assertCanReviewStory(storyId, profile.id);
  if (!canReview.ok) {
    return { ok: false, error: canReview.error, loginRequired: false, review: null };
  }

  const rateLimit = await enforceRateLimit("story_review", user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "Bạn gửi đánh giá quá nhanh. Vui lòng thử lại sau.",
      loginRequired: false,
      review: null
    };
  }

  const title = input.title?.trim() || null;
  const body = input.body?.trim() || null;

  await db.execute(sql`
    insert into public.story_reviews (
      story_id,
      reviewer_profile_id,
      overall_rating,
      plot_score,
      character_score,
      writing_style_score,
      worldbuilding_score,
      title,
      body,
      status,
      updated_at
    )
    values (
      ${storyId}::uuid,
      ${profile.id}::uuid,
      ${input.overallRating},
      ${input.plotScore},
      ${input.characterScore},
      ${input.writingStyleScore},
      ${input.worldbuildingScore},
      ${title},
      ${body},
      'visible',
      now()
    )
    on conflict (story_id, reviewer_profile_id) do update set
      overall_rating = excluded.overall_rating,
      plot_score = excluded.plot_score,
      character_score = excluded.character_score,
      writing_style_score = excluded.writing_style_score,
      worldbuilding_score = excluded.worldbuilding_score,
      title = excluded.title,
      body = excluded.body,
      status = case
        when public.story_reviews.status = 'deleted' then 'visible'
        else public.story_reviews.status
      end,
      updated_at = now()
  `);

  await refreshStoryReviewStats(storyId);

  const review = await getMyStoryReview(storyId, profile.id);

  if (review?.id) {
    const { syncStoryReviewToGroup } = await import("@/lib/community-sync/review-sync");
    void syncStoryReviewToGroup({
      reviewId: review.id,
      storyId,
      actorUserId: profile.id,
      title,
      body
    }).catch((syncError) => {
      console.error("[community-sync] review sync failed", syncError);
    });
  }

  return { ok: true, error: null, loginRequired: false, review };
}

export async function deleteMyStoryReview(reviewId: string): Promise<{
  ok: boolean;
  error: string | null;
  loginRequired: boolean;
}> {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    return { ok: false, error: null, loginRequired: true };
  }

  const existing = await db.execute(sql`
    select id, story_id, reviewer_profile_id
    from public.story_reviews
    where id = ${reviewId}::uuid
    limit 1
  `);

  const row = existing.rows[0] as
    | { id: string; story_id: string; reviewer_profile_id: string }
    | undefined;

  if (!row) {
    return { ok: false, error: "Không tìm thấy đánh giá.", loginRequired: false };
  }

  if (row.reviewer_profile_id !== profile.id) {
    return { ok: false, error: "Bạn chỉ có thể xóa đánh giá của mình.", loginRequired: false };
  }

  await db.execute(sql`
    update public.story_reviews
    set status = 'deleted', updated_at = now()
    where id = ${reviewId}::uuid
  `);

  await refreshStoryReviewStats(row.story_id);
  return { ok: true, error: null, loginRequired: false };
}

export async function markReviewHelpful(reviewId: string): Promise<{
  ok: boolean;
  error: string | null;
  loginRequired: boolean;
  helpfulCount: number;
  marked: boolean;
}> {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    return { ok: false, error: null, loginRequired: true, helpfulCount: 0, marked: false };
  }

  const reviewResult = await db.execute(sql`
    select id, helpful_count, status
    from public.story_reviews
    where id = ${reviewId}::uuid
    limit 1
  `);

  const review = reviewResult.rows[0] as
    | { id: string; helpful_count: number; status: string }
    | undefined;

  if (!review || review.status !== "visible") {
    return {
      ok: false,
      error: "Đánh giá không khả dụng.",
      loginRequired: false,
      helpfulCount: 0,
      marked: false
    };
  }

  const existing = await db.execute(sql`
    select id
    from public.story_review_helpful_votes
    where review_id = ${reviewId}::uuid
      and profile_id = ${profile.id}::uuid
    limit 1
  `);

  if (existing.rows[0]) {
    await db.execute(sql`
      delete from public.story_review_helpful_votes
      where review_id = ${reviewId}::uuid
        and profile_id = ${profile.id}::uuid
    `);
    await db.execute(sql`
      update public.story_reviews
      set helpful_count = greatest(0, helpful_count - 1), updated_at = now()
      where id = ${reviewId}::uuid
    `);

    return {
      ok: true,
      error: null,
      loginRequired: false,
      helpfulCount: Math.max(0, review.helpful_count - 1),
      marked: false
    };
  }

  await db.execute(sql`
    insert into public.story_review_helpful_votes (review_id, profile_id)
    values (${reviewId}::uuid, ${profile.id}::uuid)
  `);

  await db.execute(sql`
    update public.story_reviews
    set helpful_count = helpful_count + 1, updated_at = now()
    where id = ${reviewId}::uuid
  `);

  return {
    ok: true,
    error: null,
    loginRequired: false,
    helpfulCount: review.helpful_count + 1,
    marked: true
  };
}

export async function incrementStoryReviewReportCount(reviewId: string) {
  const { STORY_REVIEW_AUTO_HIDE_REPORT_THRESHOLD } = await import(
    "@/lib/reviews/story-review-config"
  );

  const result = await db.execute(sql`
    update public.story_reviews
    set
      report_count = report_count + 1,
      status = case
        when report_count + 1 >= ${STORY_REVIEW_AUTO_HIDE_REPORT_THRESHOLD}
          and status = 'visible'
        then 'hidden'
        else status
      end,
      updated_at = now()
    where id = ${reviewId}::uuid
    returning id, story_id, status
  `);

  const row = result.rows[0] as { id: string; story_id: string; status: string } | undefined;
  if (row) {
    await refreshStoryReviewStats(row.story_id);
  }
}

export type AdminStoryReviewListQuery = {
  status?: "visible" | "hidden" | "pending" | "all";
  reportedOnly?: boolean;
  minRating?: number;
  storyQ?: string;
  userQ?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
};

function mapAdminStoryReviewRow(row: {
  id: string;
  story_id: string;
  story_title: string;
  story_slug: string;
  reviewer_profile_id: string;
  display_name: string | null;
  username: string | null;
  overall_rating: number;
  plot_score: number;
  character_score: number;
  writing_style_score: number;
  worldbuilding_score: number;
  title: string | null;
  body: string | null;
  status: string;
  report_count: number;
  helpful_count: number;
  created_at: string;
}): AdminStoryReviewRow {
  return {
    id: row.id,
    storyId: row.story_id,
    storyTitle: row.story_title,
    storySlug: row.story_slug,
    reviewerProfileId: row.reviewer_profile_id,
    displayName: row.display_name,
    username: row.username,
    overallRating: row.overall_rating,
    plotScore: row.plot_score,
    characterScore: row.character_score,
    writingStyleScore: row.writing_style_score,
    worldbuildingScore: row.worldbuilding_score,
    title: row.title,
    body: row.body,
    status: row.status,
    reportCount: row.report_count,
    helpfulCount: row.helpful_count,
    createdAt: row.created_at
  };
}

export async function getAdminStoryReviewsPaged(
  options: AdminStoryReviewListQuery = {}
): Promise<{ items: AdminStoryReviewRow[]; total: number }> {
  const status = options.status ?? "all";
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? 20, 1), 50);
  const offset = (page - 1) * pageSize;
  const storyQ = (options.storyQ ?? "").trim();
  const userQ = (options.userQ ?? "").trim();
  const minRating = options.minRating;

  try {
    const statusFilter =
      status === "all" ? sql`true` : sql`r.status = ${status}`;
    const reportedFilter = options.reportedOnly
      ? sql`r.report_count > 0`
      : sql`true`;
    const ratingFilter =
      minRating != null && minRating >= 1 && minRating <= 5
        ? sql`r.overall_rating = ${minRating}`
        : sql`true`;
    const storyFilter = storyQ
      ? sql`(s.title ilike ${"%" + storyQ + "%"} or s.slug ilike ${"%" + storyQ + "%"})`
      : sql`true`;
    const userFilter = userQ
      ? sql`(p.username ilike ${"%" + userQ + "%"} or p.display_name ilike ${"%" + userQ + "%"})`
      : sql`true`;

    const countResult = await db.execute(sql`
      select count(*)::int as total
      from public.story_reviews r
      inner join public.stories s on s.id = r.story_id
      inner join public.profiles p on p.id = r.reviewer_profile_id
      where r.status <> 'deleted'
        and ${statusFilter}
        and ${reportedFilter}
        and ${ratingFilter}
        and ${storyFilter}
        and ${userFilter}
    `);

    const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0;

    const result = await db.execute(sql`
      select
        r.id,
        r.story_id,
        s.title as story_title,
        s.slug as story_slug,
        r.reviewer_profile_id,
        p.display_name,
        p.username,
        r.overall_rating,
        r.plot_score,
        r.character_score,
        r.writing_style_score,
        r.worldbuilding_score,
        r.title,
        r.body,
        r.status,
        r.report_count,
        r.helpful_count,
        r.created_at
      from public.story_reviews r
      inner join public.stories s on s.id = r.story_id
      inner join public.profiles p on p.id = r.reviewer_profile_id
      where r.status <> 'deleted'
        and ${statusFilter}
        and ${reportedFilter}
        and ${ratingFilter}
        and ${storyFilter}
        and ${userFilter}
      order by r.report_count desc, r.created_at desc
      limit ${pageSize}
      offset ${offset}
    `);

    const items = (
      result.rows as Array<{
        id: string;
        story_id: string;
        story_title: string;
        story_slug: string;
        reviewer_profile_id: string;
        display_name: string | null;
        username: string | null;
        overall_rating: number;
        plot_score: number;
        character_score: number;
        writing_style_score: number;
        worldbuilding_score: number;
        title: string | null;
        body: string | null;
        status: string;
        report_count: number;
        helpful_count: number;
        created_at: string;
      }>
    ).map(mapAdminStoryReviewRow);

    return { items, total };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { items: [], total: 0 };
    }
    throw error;
  }
}

export async function getAdminStoryReviewsQueue(options?: {
  status?: "visible" | "hidden" | "all";
  limit?: number;
}): Promise<AdminStoryReviewRow[]> {
  const { items } = await getAdminStoryReviewsPaged({
    status: options?.status,
    pageSize: options?.limit ?? 50,
    page: 1
  });
  return items;
}

export async function setStoryReviewModerationStatus(
  reviewId: string,
  status: "visible" | "hidden" | "pending"
): Promise<{ ok: boolean; error: string | null; storyId?: string; storySlug?: string }> {
  try {
    const result = await db.execute(sql`
      update public.story_reviews r
      set status = ${status}, updated_at = now()
      from public.stories s
      where r.id = ${reviewId}::uuid
        and r.story_id = s.id
        and r.status <> 'deleted'
      returning r.id, r.story_id, s.slug as story_slug
    `);

    const row = result.rows[0] as { id: string; story_id: string; story_slug: string } | undefined;
    if (!row) {
      return { ok: false, error: "Không tìm thấy đánh giá." };
    }

    await refreshStoryReviewStats(row.story_id);
    return { ok: true, error: null, storyId: row.story_id, storySlug: row.story_slug };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { ok: false, error: "Tính năng chưa sẵn sàng." };
    }
    throw error;
  }
}
