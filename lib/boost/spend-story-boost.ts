import "server-only";

import { sql } from "drizzle-orm";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getBoostSettings } from "@/lib/boost/boost-settings";
import {
  countUserBoostsForStoryToday,
  getStoryBoostEligibility
} from "@/lib/boost/get-boost-eligibility";
import { refreshStoryBoostDailyStats } from "@/lib/boost/refresh-boost-daily-stats";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { SpendStoryBoostResult } from "@/types/story-boost";

const MESSAGE_MAX = 200;

export async function spendStoryBoost(
  storyId: string,
  units = 1,
  message?: string | null
): Promise<SpendStoryBoostResult> {
  const settings = await getBoostSettings();
  const spendUnits = Math.max(1, Math.trunc(units));
  const amountSpent = settings.pointsPerUnit * spendUnits;
  const trimmedMessage = message?.trim().slice(0, MESSAGE_MAX) ?? null;

  const { user } = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      error: null,
      loginRequired: true,
      boostId: null,
      boostPoints: null,
      newBalance: null
    };
  }

  try {
    await assertActionAccess("comment.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return {
        ok: false,
        error: error.message,
        loginRequired: false,
        boostId: null,
        boostPoints: null,
        newBalance: null
      };
    }
    throw error;
  }

  const eligibility = await getStoryBoostEligibility({ storyId, userId: user.id });
  if (!eligibility.enabled) {
    return {
      ok: false,
      error: eligibility.reason ?? "Tính năng chưa mở.",
      loginRequired: false,
      boostId: null,
      boostPoints: null,
      newBalance: null
    };
  }

  if (!eligibility.canBoost) {
    return {
      ok: false,
      error: eligibility.reason ?? "Không thể đề cử.",
      loginRequired: false,
      boostId: null,
      boostPoints: null,
      newBalance: null
    };
  }

  if (amountSpent > eligibility.balance) {
    return {
      ok: false,
      error: "Không đủ điểm thưởng.",
      loginRequired: false,
      boostId: null,
      boostPoints: null,
      newBalance: null
    };
  }

  const rateLimit = await enforceRateLimit("story_boost", user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "Thao tác quá nhanh. Thử lại sau.",
      loginRequired: false,
      boostId: null,
      boostPoints: null,
      newBalance: null
    };
  }

  let boostPoints = settings.boostPointsPerUnit * spendUnits;
  const priorBoosts = await countUserBoostsForStoryToday(user.id, storyId);
  if (priorBoosts > 0 && settings.antiWhaleCapEnabled) {
    boostPoints = Math.max(1, Math.round(boostPoints * settings.diminishingSameStory));
  }

  if (boostPoints > eligibility.userDailyRemaining || boostPoints > eligibility.storyDailyRemaining) {
    return {
      ok: false,
      error: "Vượt giới hạn đề cử trong ngày.",
      loginRequired: false,
      boostId: null,
      boostPoints: null,
      newBalance: null
    };
  }

  try {
    const txResult = await db.execute(sql`
      with debit as (
        update public.user_reward_points
        set
          balance = balance - ${amountSpent},
          lifetime_spent = lifetime_spent + ${amountSpent},
          updated_at = now()
        where user_id = ${user.id}::uuid
          and balance >= ${amountSpent}
        returning balance
      ),
      ledger as (
        insert into public.reward_point_ledger (
          profile_id,
          amount,
          direction,
          reason,
          related_entity_type,
          related_entity_id
        )
        select
          ${user.id}::uuid,
          ${amountSpent},
          'spend',
          'story_boost',
          'story',
          ${storyId}::uuid
        from debit
        returning id
      ),
      boost as (
        insert into public.story_boosts (
          story_id,
          user_id,
          currency,
          amount_spent,
          boost_points,
          message,
          status,
          ledger_entry_id,
          metadata
        )
        select
          ${storyId}::uuid,
          ${user.id}::uuid,
          'reward_points',
          ${amountSpent},
          ${boostPoints},
          ${trimmedMessage},
          'completed',
          ledger.id,
          ${JSON.stringify({ units: spendUnits })}::jsonb
        from ledger
        returning id
      )
      select
        (select balance from debit) as balance,
        (select id from boost) as boost_id
    `);

    const row = txResult.rows[0] as { balance?: number; boost_id?: string } | undefined;
    if (!row?.boost_id) {
      return {
        ok: false,
        error: "Không đủ điểm thưởng.",
        loginRequired: false,
        boostId: null,
        boostPoints: null,
        newBalance: null
      };
    }

    await refreshStoryBoostDailyStats(storyId);

    return {
      ok: true,
      error: null,
      loginRequired: false,
      boostId: String(row.boost_id),
      boostPoints,
      newBalance: Number(row.balance ?? 0)
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        error: "Tính năng đề cử chưa sẵn sàng. Chạy migration boost mới nhất.",
        loginRequired: false,
        boostId: null,
        boostPoints: null,
        newBalance: null
      };
    }
    throw error;
  }
}
