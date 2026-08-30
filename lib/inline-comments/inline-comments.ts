import "server-only";

import { sql } from "drizzle-orm";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { hashSelectedText } from "@/lib/inline-comments/anchors";
import {
  INLINE_COMMENT_BODY_MAX,
  INLINE_COMMENT_PAGE_SIZE
} from "@/lib/inline-comments/inline-comment-config";
import { INLINE_COMMENT_QUOTE_MAX } from "@/lib/inline-comments/text-offset";
import { detectPotentialSpamContent } from "@/lib/moderation/spam-heuristics";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { canViewPublicEpisode } from "@/lib/visibility/contentVisibility";
import type {
  CreateInlineCommentInput,
  CreateInlineCommentResult,
  AdminInlineCommentRow,
  AdminInlineThreadRow,
  InlineBlockCommentCounts,
  InlineCommentView,
  InlineCommentsPageResult,
  InlineThreadDetail,
  InlineThreadsPageResult,
  InlineThreadSummary,
  ReplyInlineCommentResult
} from "@/types/inline-comment";

type EpisodeAccessRow = {
  id: string;
  status: string;
  story_id: string;
  story_status: string;
  story_visibility: string;
  content_hash: string | null;
};

type ThreadSummaryRow = {
  thread_id: string;
  anchor_id: string;
  block_id: string;
  start_offset: number;
  end_offset: number;
  quote_text: string;
  anchor_status: string;
  reply_count: number;
  comment_count: string | number;
  last_activity_at: string;
};

type CommentRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  display_name: string | null;
  username: string | null;
};

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapThreadSummary(row: ThreadSummaryRow): InlineThreadSummary {
  return {
    threadId: row.thread_id,
    anchorId: row.anchor_id,
    blockId: row.block_id,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    quoteText: row.quote_text,
    anchorStatus: row.anchor_status as InlineThreadSummary["anchorStatus"],
    replyCount: row.reply_count,
    commentCount: toNumber(row.comment_count),
    lastActivityAt: row.last_activity_at
  };
}

function mapComment(row: CommentRow, viewerProfileId: string | null): InlineCommentView {
  return {
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: row.created_at,
    displayName: row.display_name,
    username: row.username,
    canDelete: viewerProfileId != null && row.user_id === viewerProfileId
  };
}

async function loadEpisodeAccess(chapterId: string): Promise<EpisodeAccessRow | null> {
  const result = await db.execute(sql`
    select
      e.id,
      e.status,
      e.story_id,
      e.content_hash,
      s.status as story_status,
      s.visibility as story_visibility
    from public.episodes e
    inner join public.stories s on s.id = e.story_id
    where e.id = ${chapterId}::uuid
    limit 1
  `);

  const row = result.rows[0] as EpisodeAccessRow | undefined;
  return row ?? null;
}

async function assertChapterReadable(chapterId: string) {
  const episode = await loadEpisodeAccess(chapterId);
  if (!episode) {
    return { ok: false as const, error: "Không tìm thấy chương." };
  }

  const canView = canViewPublicEpisode(
    episode.status,
    episode.story_status,
    episode.story_visibility
  );

  if (!canView) {
    return { ok: false as const, error: "Chương không khả dụng." };
  }

  return { ok: true as const, episode };
}

function validateAnchorInput(input: {
  blockId: string;
  startOffset: number;
  endOffset: number;
  quoteText: string;
}) {
  if (!input.blockId.trim()) {
    return "Thiếu block_id.";
  }
  if (input.startOffset < 0 || input.endOffset <= input.startOffset) {
    return "Vị trí đoạn trích không hợp lệ.";
  }
  const quote = input.quoteText.trim();
  if (!quote || quote.length > INLINE_COMMENT_QUOTE_MAX) {
    return "Đoạn trích không hợp lệ.";
  }
  return null;
}

function validateBody(body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return "Bình luận không được để trống.";
  }
  if (trimmed.length > INLINE_COMMENT_BODY_MAX) {
    return `Bình luận tối đa ${INLINE_COMMENT_BODY_MAX} ký tự.`;
  }
  return null;
}

export async function getInlineCommentCounts(
  chapterId: string
): Promise<InlineBlockCommentCounts[]> {
  try {
    const access = await assertChapterReadable(chapterId);
    if (!access.ok) {
      return [];
    }

    const result = await db.execute(sql`
      select
        a.block_id,
        count(distinct t.id)::int as thread_count,
        count(c.id)::int as comment_count
      from public.inline_comment_threads t
      inner join public.inline_comment_anchors a on a.id = t.anchor_id
      inner join public.inline_comments c on c.thread_id = t.id
        and c.status = 'visible'
        and c.engagement_source = 'user'
      where t.chapter_id = ${chapterId}::uuid
        and a.status = 'active'
      group by a.block_id
      order by a.block_id asc
    `);

    return (result.rows as Array<{
      block_id: string;
      thread_count: number;
      comment_count: number;
    }>).map((row) => ({
      blockId: row.block_id,
      threadCount: row.thread_count,
      commentCount: row.comment_count
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getInlineThreadsForBlock(
  chapterId: string,
  blockId: string
): Promise<InlineThreadSummary[]> {
  try {
    const access = await assertChapterReadable(chapterId);
    if (!access.ok) {
      return [];
    }

    const result = await db.execute(sql`
      select
        t.id as thread_id,
        a.id as anchor_id,
        a.block_id,
        a.start_offset,
        a.end_offset,
        a.quote_text,
        a.status as anchor_status,
        t.reply_count,
        t.last_activity_at,
        (
          select count(*)::int
          from public.inline_comments c
          where c.thread_id = t.id
            and c.status = 'visible'
            and c.engagement_source = 'user'
        ) as comment_count
      from public.inline_comment_threads t
      inner join public.inline_comment_anchors a on a.id = t.anchor_id
      where t.chapter_id = ${chapterId}::uuid
        and a.block_id = ${blockId}
        and a.status = 'active'
        and exists (
          select 1
          from public.inline_comments c
          where c.thread_id = t.id
            and c.status = 'visible'
            and c.engagement_source = 'user'
        )
      order by t.last_activity_at desc
    `);

    return (result.rows as ThreadSummaryRow[]).map(mapThreadSummary);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getInlineComments(
  threadId: string,
  page = 1,
  viewerProfileId?: string | null
): Promise<InlineCommentsPageResult> {
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * INLINE_COMMENT_PAGE_SIZE;

  try {
    const threadMeta = await db.execute(sql`
      select t.chapter_id
      from public.inline_comment_threads t
      where t.id = ${threadId}::uuid
      limit 1
    `);
    const chapterId = (threadMeta.rows[0] as { chapter_id?: string } | undefined)?.chapter_id;
    if (!chapterId) {
      return {
        comments: [],
        page: safePage,
        pageSize: INLINE_COMMENT_PAGE_SIZE,
        totalCount: 0,
        hasMore: false
      };
    }

    const access = await assertChapterReadable(chapterId);
    if (!access.ok) {
      return {
        comments: [],
        page: safePage,
        pageSize: INLINE_COMMENT_PAGE_SIZE,
        totalCount: 0,
        hasMore: false
      };
    }

    const [countResult, listResult] = await Promise.all([
      db.execute(sql`
        select count(*)::int as total
        from public.inline_comments c
        where c.thread_id = ${threadId}::uuid
          and c.status = 'visible'
          and c.engagement_source = 'user'
      `),
      db.execute(sql`
        select
          c.id,
          c.user_id,
          c.parent_id,
          c.body,
          c.created_at,
          p.display_name,
          p.username
        from public.inline_comments c
        inner join public.profiles p on p.id = c.user_id
        where c.thread_id = ${threadId}::uuid
          and c.status = 'visible'
          and c.engagement_source = 'user'
        order by c.created_at asc
        limit ${INLINE_COMMENT_PAGE_SIZE}
        offset ${offset}
      `)
    ]);

    const totalCount = toNumber((countResult.rows[0] as { total?: number })?.total);
    const comments = (listResult.rows as CommentRow[]).map((row) =>
      mapComment(row, viewerProfileId ?? null)
    );

    return {
      comments,
      page: safePage,
      pageSize: INLINE_COMMENT_PAGE_SIZE,
      totalCount,
      hasMore: offset + comments.length < totalCount
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        comments: [],
        page: safePage,
        pageSize: INLINE_COMMENT_PAGE_SIZE,
        totalCount: 0,
        hasMore: false
      };
    }
    throw error;
  }
}

export async function getInlineThreadsForChapter(
  chapterId: string,
  options?: { page?: number; viewerProfileId?: string | null }
): Promise<InlineThreadsPageResult> {
  const page = Math.max(1, options?.page ?? 1);
  const offset = (page - 1) * INLINE_COMMENT_PAGE_SIZE;

  try {
    const access = await assertChapterReadable(chapterId);
    if (!access.ok) {
      return {
        threads: [],
        page,
        pageSize: INLINE_COMMENT_PAGE_SIZE,
        totalCount: 0,
        hasMore: false
      };
    }

    const [countResult, listResult] = await Promise.all([
      db.execute(sql`
        select count(*)::int as total
        from public.inline_comment_threads t
        inner join public.inline_comment_anchors a on a.id = t.anchor_id
        where t.chapter_id = ${chapterId}::uuid
          and a.status <> 'suppressed'
          and exists (
            select 1
            from public.inline_comments c
            where c.thread_id = t.id
              and c.status = 'visible'
              and c.engagement_source = 'user'
          )
      `),
      db.execute(sql`
        select
          t.id as thread_id,
          a.id as anchor_id,
          a.block_id,
          a.start_offset,
          a.end_offset,
          a.quote_text,
          a.status as anchor_status,
          t.reply_count,
          t.last_activity_at,
          (
            select count(*)::int
            from public.inline_comments c
            where c.thread_id = t.id
              and c.status = 'visible'
              and c.engagement_source = 'user'
          ) as comment_count
        from public.inline_comment_threads t
        inner join public.inline_comment_anchors a on a.id = t.anchor_id
        where t.chapter_id = ${chapterId}::uuid
          and a.status <> 'suppressed'
          and exists (
            select 1
            from public.inline_comments c
            where c.thread_id = t.id
              and c.status = 'visible'
              and c.engagement_source = 'user'
          )
        order by t.last_activity_at desc
        limit ${INLINE_COMMENT_PAGE_SIZE}
        offset ${offset}
      `)
    ]);

    const totalCount = toNumber((countResult.rows[0] as { total?: number })?.total);
    const threads = (listResult.rows as ThreadSummaryRow[]).map(mapThreadSummary);

    return {
      threads,
      page,
      pageSize: INLINE_COMMENT_PAGE_SIZE,
      totalCount,
      hasMore: offset + threads.length < totalCount
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        threads: [],
        page,
        pageSize: INLINE_COMMENT_PAGE_SIZE,
        totalCount: 0,
        hasMore: false
      };
    }
    throw error;
  }
}

export async function getInlineThreadDetail(
  threadId: string,
  viewerProfileId?: string | null
): Promise<InlineThreadDetail | null> {
  try {
    const threadResult = await db.execute(sql`
      select
        t.id as thread_id,
        t.chapter_id,
        t.story_id,
        t.reply_count,
        t.last_activity_at,
        t.is_locked,
        a.id as anchor_id,
        a.block_id,
        a.start_offset,
        a.end_offset,
        a.quote_text,
        a.status as anchor_status
      from public.inline_comment_threads t
      inner join public.inline_comment_anchors a on a.id = t.anchor_id
      where t.id = ${threadId}::uuid
      limit 1
    `);

    const threadRow = threadResult.rows[0] as
      | (ThreadSummaryRow & {
          chapter_id: string;
          story_id: string;
          is_locked: boolean;
        })
      | undefined;

    if (!threadRow) {
      return null;
    }

    const access = await assertChapterReadable(threadRow.chapter_id);
    if (!access.ok) {
      return null;
    }

    return {
      ...mapThreadSummary(threadRow),
      chapterId: threadRow.chapter_id,
      storyId: threadRow.story_id,
      comments: []
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return null;
    }
    throw error;
  }
}

export async function createInlineComment(
  input: CreateInlineCommentInput
): Promise<CreateInlineCommentResult> {
  const bodyError = validateBody(input.body);
  if (bodyError) {
    return { ok: false, error: bodyError, loginRequired: false, threadId: null, commentId: null };
  }

  const anchorError = validateAnchorInput(input);
  if (anchorError) {
    return { ok: false, error: anchorError, loginRequired: false, threadId: null, commentId: null };
  }

  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: null, loginRequired: true, threadId: null, commentId: null };
  }

  try {
    await assertActionAccess("comment.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message, loginRequired: false, threadId: null, commentId: null };
    }
    throw error;
  }

  const restriction = await assertNotRestricted(
    user.id,
    "comment_block",
    "Bạn đang bị hạn chế bình luận. Xem /me/account-status."
  );
  if (!restriction.ok) {
    return {
      ok: false,
      error: restriction.error,
      loginRequired: false,
      threadId: null,
      commentId: null
    };
  }

  const access = await assertChapterReadable(input.chapterId);
  if (!access.ok) {
    return { ok: false, error: access.error, loginRequired: false, threadId: null, commentId: null };
  }

  if (access.episode.story_id !== input.storyId) {
    return {
      ok: false,
      error: "Thông tin truyện không khớp.",
      loginRequired: false,
      threadId: null,
      commentId: null
    };
  }

  const rateLimit = await enforceRateLimit("inline_comment", user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "Bạn đang bình luận quá nhanh. Thử lại sau.",
      loginRequired: false,
      threadId: null,
      commentId: null
    };
  }

  const spam = detectPotentialSpamContent({ content: input.body.trim() });
  if (spam.suspected) {
    return {
      ok: false,
      error: "Nội dung có thể là spam. Vui lòng chỉnh sửa.",
      loginRequired: false,
      threadId: null,
      commentId: null
    };
  }

  const contentHash =
    input.contentHashAtAnchor ?? access.episode.content_hash ?? null;
  const selectedTextHash = hashSelectedText(input.quoteText);

  try {
    const existingResult = await db.execute(sql`
      select t.id as thread_id
      from public.inline_comment_anchors a
      inner join public.inline_comment_threads t on t.anchor_id = a.id
      where a.chapter_id = ${input.chapterId}::uuid
        and a.block_id = ${input.blockId}
        and a.start_offset = ${input.startOffset}
        and a.end_offset = ${input.endOffset}
        and a.status = 'active'
      limit 1
    `);

    const existingThread = existingResult.rows[0] as { thread_id: string } | undefined;

    if (existingThread) {
      const lockedResult = await db.execute(sql`
        select is_locked from public.inline_comment_threads
        where id = ${existingThread.thread_id}::uuid
        limit 1
      `);
      const isLocked = Boolean((lockedResult.rows[0] as { is_locked?: boolean })?.is_locked);
      if (isLocked) {
        return {
          ok: false,
          error: "Luồng bình luận này đã bị khóa.",
          loginRequired: false,
          threadId: null,
          commentId: null
        };
      }

      const insertResult = await db.execute(sql`
        insert into public.inline_comments (thread_id, user_id, body)
        values (${existingThread.thread_id}::uuid, ${user.id}::uuid, ${input.body.trim()})
        returning id
      `);

      const commentId = String((insertResult.rows[0] as { id: string }).id);

      await db.execute(sql`
        update public.inline_comment_threads
        set
          reply_count = reply_count + 1,
          last_activity_at = now()
        where id = ${existingThread.thread_id}::uuid
      `);

      return {
        ok: true,
        error: null,
        loginRequired: false,
        threadId: existingThread.thread_id,
        commentId
      };
    }

    const txResult = await db.execute(sql`
      with new_anchor as (
        insert into public.inline_comment_anchors (
          chapter_id,
          story_id,
          block_id,
          block_index,
          start_offset,
          end_offset,
          quote_text,
          content_hash_at_anchor,
          selected_text_hash,
          prefix_text,
          suffix_text
        )
        values (
          ${input.chapterId}::uuid,
          ${input.storyId}::uuid,
          ${input.blockId},
          ${input.blockIndex ?? null},
          ${input.startOffset},
          ${input.endOffset},
          ${input.quoteText},
          ${contentHash},
          ${selectedTextHash},
          ${input.prefixText ?? null},
          ${input.suffixText ?? null}
        )
        returning id
      ),
      new_thread as (
        insert into public.inline_comment_threads (anchor_id, chapter_id, story_id)
        select id, ${input.chapterId}::uuid, ${input.storyId}::uuid
        from new_anchor
        returning id, anchor_id
      ),
      new_comment as (
        insert into public.inline_comments (thread_id, user_id, body)
        select id, ${user.id}::uuid, ${input.body.trim()}
        from new_thread
        returning id, thread_id
      )
      select
        new_comment.id as comment_id,
        new_comment.thread_id
      from new_comment
    `);

    const row = txResult.rows[0] as { comment_id: string; thread_id: string } | undefined;
    if (!row) {
      return {
        ok: false,
        error: "Không thể tạo bình luận.",
        loginRequired: false,
        threadId: null,
        commentId: null
      };
    }

    return {
      ok: true,
      error: null,
      loginRequired: false,
      threadId: row.thread_id,
      commentId: row.comment_id
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        error: "Tính năng bình luận đoạn chưa sẵn sàng.",
        loginRequired: false,
        threadId: null,
        commentId: null
      };
    }
    throw error;
  }
}

export async function replyToInlineThread(
  threadId: string,
  body: string,
  parentId?: string | null
): Promise<ReplyInlineCommentResult> {
  const bodyError = validateBody(body);
  if (bodyError) {
    return { ok: false, error: bodyError, loginRequired: false, commentId: null };
  }

  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: null, loginRequired: true, commentId: null };
  }

  try {
    await assertActionAccess("comment.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message, loginRequired: false, commentId: null };
    }
    throw error;
  }

  const restriction = await assertNotRestricted(
    user.id,
    "comment_block",
    "Bạn đang bị hạn chế bình luận. Xem /me/account-status."
  );
  if (!restriction.ok) {
    return { ok: false, error: restriction.error, loginRequired: false, commentId: null };
  }

  const rateLimit = await enforceRateLimit("inline_comment", user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "Bạn đang bình luận quá nhanh. Thử lại sau.",
      loginRequired: false,
      commentId: null
    };
  }

  const spam = detectPotentialSpamContent({ content: body.trim() });
  if (spam.suspected) {
    return {
      ok: false,
      error: "Nội dung có thể là spam. Vui lòng chỉnh sửa.",
      loginRequired: false,
      commentId: null
    };
  }

  try {
    const threadResult = await db.execute(sql`
      select t.id, t.chapter_id, t.is_locked
      from public.inline_comment_threads t
      where t.id = ${threadId}::uuid
      limit 1
    `);

    const thread = threadResult.rows[0] as
      | { id: string; chapter_id: string; is_locked: boolean }
      | undefined;

    if (!thread) {
      return { ok: false, error: "Không tìm thấy luồng bình luận.", loginRequired: false, commentId: null };
    }

    if (thread.is_locked) {
      return { ok: false, error: "Luồng bình luận này đã bị khóa.", loginRequired: false, commentId: null };
    }

    const access = await assertChapterReadable(thread.chapter_id);
    if (!access.ok) {
      return { ok: false, error: access.error, loginRequired: false, commentId: null };
    }

    if (parentId) {
      const parentResult = await db.execute(sql`
        select id, thread_id, parent_id
        from public.inline_comments
        where id = ${parentId}::uuid
          and status = 'visible'
        limit 1
      `);
      const parent = parentResult.rows[0] as
        | { id: string; thread_id: string; parent_id: string | null }
        | undefined;

      if (!parent || parent.thread_id !== threadId) {
        return { ok: false, error: "Bình luận gốc không hợp lệ.", loginRequired: false, commentId: null };
      }

      if (parent.parent_id != null) {
        return {
          ok: false,
          error: "Chỉ hỗ trợ trả lời một cấp.",
          loginRequired: false,
          commentId: null
        };
      }
    }

    const insertResult = await db.execute(sql`
      insert into public.inline_comments (thread_id, user_id, parent_id, body)
      values (
        ${threadId}::uuid,
        ${user.id}::uuid,
        ${parentId ?? null},
        ${body.trim()}
      )
      returning id
    `);

    const commentId = String((insertResult.rows[0] as { id: string }).id);

    await db.execute(sql`
      update public.inline_comment_threads
      set
        reply_count = reply_count + 1,
        last_activity_at = now()
      where id = ${threadId}::uuid
    `);

    return { ok: true, error: null, loginRequired: false, commentId };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        error: "Tính năng bình luận đoạn chưa sẵn sàng.",
        loginRequired: false,
        commentId: null
      };
    }
    throw error;
  }
}

export async function deleteMyInlineComment(commentId: string): Promise<{ ok: boolean; error: string | null }> {
  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Cần đăng nhập." };
  }

  try {
    const result = await db.execute(sql`
      update public.inline_comments
      set status = 'deleted', updated_at = now()
      where id = ${commentId}::uuid
        and user_id = ${user.id}::uuid
        and status = 'visible'
      returning id, thread_id
    `);

    const row = result.rows[0] as { id: string; thread_id: string } | undefined;
    if (!row) {
      return { ok: false, error: "Không thể xóa bình luận." };
    }

    await db.execute(sql`
      update public.inline_comment_threads t
      set reply_count = greatest(0, (
        select count(*)::int - 1
        from public.inline_comments c
        where c.thread_id = t.id
          and c.status = 'visible'
          and c.engagement_source = 'user'
      ))
      where t.id = ${row.thread_id}::uuid
    `);

    return { ok: true, error: null };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { ok: false, error: "Tính năng chưa sẵn sàng." };
    }
    throw error;
  }
}

/** PROMPT 4 alias */
export const createInlineCommentThread = createInlineComment;

export async function incrementInlineCommentReportCount(commentId: string) {
  const { INLINE_COMMENT_AUTO_HIDE_REPORT_THRESHOLD } = await import(
    "@/lib/inline-comments/inline-comment-config"
  );

  const result = await db.execute(sql`
    update public.inline_comments
    set
      report_count = report_count + 1,
      status = case
        when report_count + 1 >= ${INLINE_COMMENT_AUTO_HIDE_REPORT_THRESHOLD}
          and status = 'visible'
        then 'hidden'
        else status
      end,
      updated_at = now()
    where id = ${commentId}::uuid
    returning id, status, report_count
  `);

  return result.rows[0] as
    | { id: string; status: string; report_count: number }
    | undefined;
}

export type AdminInlineThreadListQuery = {
  status?: "visible" | "hidden" | "all";
  orphanedOnly?: boolean;
  reportedOnly?: boolean;
  chapterQ?: string;
  page?: number;
  pageSize?: number;
};

export async function getAdminInlineThreadsPaged(
  options: AdminInlineThreadListQuery = {}
): Promise<{ items: AdminInlineThreadRow[]; total: number }> {
  const status = options.status ?? "all";
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? 20, 1), 50);
  const offset = (page - 1) * pageSize;
  const chapterQ = (options.chapterQ ?? "").trim();

  try {
    const statusFilter =
      status === "all"
        ? sql`true`
        : sql`exists (
            select 1 from public.inline_comments c2
            where c2.thread_id = t.id
              and c2.engagement_source = 'user'
              and c2.status = ${status}
          )`;
    const orphanedFilter = options.orphanedOnly ? sql`a.status = 'orphaned'` : sql`true`;
    const reportedFilter = options.reportedOnly
      ? sql`coalesce(sum(c.report_count), 0) > 0`
      : sql`true`;
    const chapterFilter = chapterQ
      ? sql`(
          s.title ilike ${"%" + chapterQ + "%"}
          or s.slug ilike ${"%" + chapterQ + "%"}
          or e.title ilike ${"%" + chapterQ + "%"}
          or cast(e.episode_number as text) = ${chapterQ}
        )`
      : sql`true`;

    const countResult = await db.execute(sql`
      select count(*)::int as total
      from (
        select t.id
        from public.inline_comment_threads t
        inner join public.inline_comment_anchors a on a.id = t.anchor_id
        inner join public.episodes e on e.id = a.chapter_id
        inner join public.stories s on s.id = a.story_id
        left join public.inline_comments c on c.thread_id = t.id and c.engagement_source = 'user'
        where ${statusFilter}
          and ${orphanedFilter}
          and ${chapterFilter}
        group by t.id, a.status
        having ${reportedFilter}
      ) sub
    `);

    const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0;

    const result = await db.execute(sql`
      select
        t.id as thread_id,
        s.id as story_id,
        s.title as story_title,
        s.slug as story_slug,
        a.chapter_id,
        e.title as chapter_title,
        e.episode_number,
        a.block_id,
        a.quote_text,
        a.status as anchor_status,
        case
          when bool_or(c.status = 'hidden') and bool_and(c.status = 'hidden' or c.status = 'deleted') then 'hidden'
          when bool_or(c.status = 'visible') then 'visible'
          else 'mixed'
        end as thread_status,
        count(c.id)::int as comment_count,
        coalesce(sum(c.report_count), 0)::int as report_count,
        (
          select p.display_name
          from public.inline_comments fc
          inner join public.profiles p on p.id = fc.user_id
          where fc.thread_id = t.id and fc.engagement_source = 'user'
          order by fc.created_at asc
          limit 1
        ) as author_display_name,
        (
          select p.username
          from public.inline_comments fc
          inner join public.profiles p on p.id = fc.user_id
          where fc.thread_id = t.id and fc.engagement_source = 'user'
          order by fc.created_at asc
          limit 1
        ) as author_username,
        t.created_at
      from public.inline_comment_threads t
      inner join public.inline_comment_anchors a on a.id = t.anchor_id
      inner join public.episodes e on e.id = a.chapter_id
      inner join public.stories s on s.id = a.story_id
      left join public.inline_comments c on c.thread_id = t.id and c.engagement_source = 'user'
      where ${statusFilter}
        and ${orphanedFilter}
        and ${chapterFilter}
      group by
        t.id,
        s.id,
        s.title,
        s.slug,
        a.chapter_id,
        e.title,
        e.episode_number,
        a.block_id,
        a.quote_text,
        a.status,
        t.created_at
      having ${reportedFilter}
      order by report_count desc, t.created_at desc
      limit ${pageSize}
      offset ${offset}
    `);

    const items = (
      result.rows as Array<{
        thread_id: string;
        story_id: string;
        story_title: string;
        story_slug: string;
        chapter_id: string;
        chapter_title: string | null;
        episode_number: number | null;
        block_id: string;
        quote_text: string;
        anchor_status: string;
        thread_status: string;
        comment_count: number;
        report_count: number;
        author_display_name: string | null;
        author_username: string | null;
        created_at: string;
      }>
    ).map((row) => ({
      threadId: row.thread_id,
      storyId: row.story_id,
      storyTitle: row.story_title,
      storySlug: row.story_slug,
      chapterId: row.chapter_id,
      chapterTitle: row.chapter_title,
      episodeNumber: row.episode_number,
      blockId: row.block_id,
      quoteText: row.quote_text,
      anchorStatus: row.anchor_status,
      threadStatus: row.thread_status,
      commentCount: row.comment_count,
      reportCount: row.report_count,
      authorDisplayName: row.author_display_name,
      authorUsername: row.author_username,
      createdAt: row.created_at
    }));

    return { items, total };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { items: [], total: 0 };
    }
    throw error;
  }
}

export async function getAdminInlineCommentsQueue(options?: {
  status?: "visible" | "hidden" | "all";
  limit?: number;
}): Promise<AdminInlineCommentRow[]> {
  const { items } = await getAdminInlineThreadsPaged({
    status: options?.status,
    pageSize: options?.limit ?? 50,
    page: 1
  });

  return items.map((thread) => ({
    id: thread.threadId,
    body: thread.quoteText,
    status: thread.threadStatus,
    reportCount: thread.reportCount,
    createdAt: thread.createdAt,
    userId: "",
    displayName: thread.authorDisplayName,
    username: thread.authorUsername,
    quoteText: thread.quoteText,
    blockId: thread.blockId,
    anchorStatus: thread.anchorStatus,
    chapterId: thread.chapterId,
    chapterTitle: thread.chapterTitle,
    episodeNumber: thread.episodeNumber,
    storyId: thread.storyId,
    storyTitle: thread.storyTitle,
    storySlug: thread.storySlug,
    threadId: thread.threadId
  }));
}

export async function setInlineThreadModerationStatus(
  threadId: string,
  action: "hide" | "restore" | "resolve"
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const commentStatus = action === "restore" ? "visible" : "hidden";

    const threadCheck = await db.execute(sql`
      select t.id, a.id as anchor_id
      from public.inline_comment_threads t
      inner join public.inline_comment_anchors a on a.id = t.anchor_id
      where t.id = ${threadId}::uuid
      limit 1
    `);

    if (!threadCheck.rows[0]) {
      return { ok: false, error: "Không tìm thấy luồng bình luận." };
    }

    const anchorId = (threadCheck.rows[0] as { anchor_id: string }).anchor_id;

    await db.execute(sql`
      update public.inline_comments
      set status = ${commentStatus}, updated_at = now()
      where thread_id = ${threadId}::uuid
        and engagement_source = 'user'
        and status <> 'deleted'
    `);

    if (action === "resolve") {
      await db.execute(sql`
        update public.inline_comment_anchors
        set status = 'suppressed'
        where id = ${anchorId}::uuid
      `);
    } else if (action === "restore") {
      await db.execute(sql`
        update public.inline_comment_anchors
        set status = 'active'
        where id = ${anchorId}::uuid
          and status = 'suppressed'
      `);
    }

    return { ok: true, error: null };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { ok: false, error: "Tính năng chưa sẵn sàng." };
    }
    throw error;
  }
}

export async function setInlineCommentModerationStatus(
  commentId: string,
  status: "visible" | "hidden"
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const result = await db.execute(sql`
      update public.inline_comments
      set status = ${status}, updated_at = now()
      where id = ${commentId}::uuid
        and engagement_source = 'user'
      returning id
    `);

    if (!result.rows[0]) {
      return { ok: false, error: "Không tìm thấy bình luận." };
    }

    return { ok: true, error: null };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { ok: false, error: "Tính năng chưa sẵn sàng." };
    }
    throw error;
  }
}
