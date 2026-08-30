import "server-only";

import { sql } from "drizzle-orm";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  DEFAULT_CHAPTER_REACTION_TYPES,
  USER_REACTION_ORIGIN
} from "@/lib/reactions/chapter-reaction-defaults";
import { safeRecordFanScoreAction } from "@/lib/data/fan-scores";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { canViewPublicEpisode } from "@/lib/visibility/contentVisibility";
import type {
  ChapterReactionTypeRow,
  ChapterReactionsSnapshot,
  ToggleChapterReactionResult
} from "@/types/reaction";

type ReactionCountRow = {
  reaction_type_key: string;
  real_count: string | number;
  seed_count: string | number;
  visible_count: string | number;
};

type EpisodeAccessRow = {
  id: string;
  status: string;
  story_id: string;
  story_status: string;
  story_visibility: string;
};

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listChapterReactionTypes(options?: {
  includeDisabled?: boolean;
}): Promise<ChapterReactionTypeRow[]> {
  try {
    const result = await db.execute(sql`
      select key, label, emoji, is_enabled, sort_order
      from public.chapter_reaction_types
      where ${options?.includeDisabled ? sql`true` : sql`is_enabled = true`}
      order by sort_order asc, key asc
    `);

    const rows = result.rows as Array<{
      key: string;
      label: string;
      emoji: string;
      is_enabled: boolean;
      sort_order: number;
    }>;

    if (rows.length === 0) {
      return DEFAULT_CHAPTER_REACTION_TYPES.map((item) => ({
        key: item.key,
        label: item.label,
        emoji: item.emoji,
        isEnabled: true,
        sortOrder: item.sortOrder
      }));
    }

    return rows.map((row) => ({
      key: row.key,
      label: row.label,
      emoji: row.emoji,
      isEnabled: row.is_enabled,
      sortOrder: row.sort_order
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return DEFAULT_CHAPTER_REACTION_TYPES.map((item) => ({
        key: item.key,
        label: item.label,
        emoji: item.emoji,
        isEnabled: true,
        sortOrder: item.sortOrder
      }));
    }
    throw error;
  }
}

async function loadEpisodeAccess(chapterId: string): Promise<EpisodeAccessRow | null> {
  const result = await db.execute(sql`
    select
      e.id,
      e.status,
      e.story_id,
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

async function assertCanViewChapterForReactions(chapterId: string) {
  const episode = await loadEpisodeAccess(chapterId);
  if (!episode) {
    return { ok: false as const, error: "Không tìm thấy chương.", storyId: null };
  }

  if (
    !canViewPublicEpisode(
      episode.status,
      episode.story_status,
      episode.story_visibility
    )
  ) {
    return { ok: false as const, error: "Chương này chưa công khai.", storyId: null };
  }

  return { ok: true as const, episode, storyId: episode.story_id };
}

async function loadReactionCounts(chapterId: string): Promise<Map<string, ReactionCountRow>> {
  const result = await db.execute(sql`
    select
      reaction_type_key,
      count(*) filter (where origin = 'user')::int as real_count,
      count(*) filter (where origin in ('admin_seed', 'system_seed'))::int as seed_count,
      count(*)::int as visible_count
    from public.chapter_reactions
    where chapter_id = ${chapterId}::uuid
    group by reaction_type_key
  `);

  const map = new Map<string, ReactionCountRow>();
  for (const row of result.rows as ReactionCountRow[]) {
    map.set(row.reaction_type_key, row);
  }
  return map;
}

async function loadMyReactionKeys(
  chapterId: string,
  profileId: string | null | undefined
): Promise<Set<string>> {
  if (!profileId) {
    return new Set();
  }

  const result = await db.execute(sql`
    select reaction_type_key
    from public.chapter_reactions
    where chapter_id = ${chapterId}::uuid
      and profile_id = ${profileId}::uuid
      and origin = 'user'
  `);

  return new Set(
    (result.rows as Array<{ reaction_type_key: string }>).map((row) => row.reaction_type_key)
  );
}

function buildSnapshot(input: {
  chapterId: string;
  types: ChapterReactionTypeRow[];
  counts: Map<string, ReactionCountRow>;
  selectedKeys: Set<string>;
  canReact: boolean;
}): ChapterReactionsSnapshot {
  return {
    chapterId: input.chapterId,
    canReact: input.canReact,
    types: input.types.map((type) => {
      const counts = input.counts.get(type.key);
      return {
        key: type.key,
        label: type.label,
        emoji: type.emoji,
        realCount: toNumber(counts?.real_count),
        seedCount: toNumber(counts?.seed_count),
        visibleCount: toNumber(counts?.visible_count),
        isSelected: input.selectedKeys.has(type.key)
      };
    })
  };
}

export async function getMyChapterReactions(
  chapterId: string,
  profileId?: string | null
): Promise<string[]> {
  const access = await assertCanViewChapterForReactions(chapterId);
  if (!access.ok) {
    return [];
  }

  return [...(await loadMyReactionKeys(chapterId, profileId))];
}

export async function getChapterReactions(
  chapterId: string,
  profileId?: string | null
): Promise<ChapterReactionsSnapshot | null> {
  const access = await assertCanViewChapterForReactions(chapterId);
  if (!access.ok) {
    return null;
  }

  const [types, counts, selectedKeys] = await Promise.all([
    listChapterReactionTypes(),
    loadReactionCounts(chapterId),
    loadMyReactionKeys(chapterId, profileId)
  ]);

  return buildSnapshot({
    chapterId,
    types,
    counts,
    selectedKeys,
    canReact: true
  });
}

export async function toggleChapterReaction(
  chapterId: string,
  reactionTypeKey: string
): Promise<ToggleChapterReactionResult> {
  const trimmedKey = reactionTypeKey.trim();
  if (!trimmedKey) {
    return { ok: false, error: "Thiếu loại cảm xúc.", snapshot: null, loginRequired: false };
  }

  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    return { ok: false, error: null, snapshot: null, loginRequired: true };
  }

  try {
    await assertActionAccess("reaction.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message, snapshot: null, loginRequired: false };
    }
    throw error;
  }

  const restriction = await assertNotRestricted(
    user.id,
    "comment_block",
    "Bạn đang bị hạn chế tương tác. Xem /me/account-status."
  );
  if (!restriction.ok) {
    return { ok: false, error: restriction.error, snapshot: null, loginRequired: false };
  }

  const access = await assertCanViewChapterForReactions(chapterId);
  if (!access.ok) {
    return { ok: false, error: access.error, snapshot: null, loginRequired: false };
  }

  const enabledTypes = await listChapterReactionTypes();
  const type = enabledTypes.find((item) => item.key === trimmedKey);
  if (!type) {
    return {
      ok: false,
      error: "Cảm xúc này không khả dụng.",
      snapshot: null,
      loginRequired: false
    };
  }

  const rateLimit = await enforceRateLimit("chapter_reaction", user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
      snapshot: null,
      loginRequired: false
    };
  }

  const existing = await db.execute(sql`
    select id
    from public.chapter_reactions
    where chapter_id = ${chapterId}::uuid
      and profile_id = ${profile.id}::uuid
      and reaction_type_key = ${trimmedKey}
      and origin = ${USER_REACTION_ORIGIN}
    limit 1
  `);

  const existingId = (existing.rows[0] as { id?: string } | undefined)?.id;

  if (existingId) {
    await db.execute(sql`
      delete from public.chapter_reactions
      where id = ${existingId}::uuid
    `);
  } else {
    await db.execute(sql`
      insert into public.chapter_reactions (
        chapter_id,
        profile_id,
        reaction_type_key,
        origin
      )
      values (
        ${chapterId}::uuid,
        ${profile.id}::uuid,
        ${trimmedKey},
        ${USER_REACTION_ORIGIN}
      )
    `);

    await safeRecordFanScoreAction({
      authorId: null,
      eventKey: "chapter_reaction",
      metadata: {
        chapter_id: chapterId,
        story_id: access.storyId,
        reaction_type_key: trimmedKey
      },
      sourceId: chapterId,
      storyId: access.storyId ?? undefined,
      userId: user.id
    });
  }

  const snapshot = await getChapterReactions(chapterId, profile.id);
  return { ok: true, error: null, snapshot, loginRequired: false, toggledOff: Boolean(existingId) };
}

/** @deprecated Use getChapterReactions — kept for legacy imports. */
export async function getChapterReactionView(
  chapterId: string,
  profileId?: string | null
) {
  return getChapterReactions(chapterId, profileId);
}
