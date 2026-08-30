import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { RecommendationTicketSourceType } from "@/lib/recommendations/config";

export type EarnTicketsInput = {
  userId: string;
  amount: number;
  sourceType: RecommendationTicketSourceType;
  sourceId: string;
  storyId?: string | null;
  chapterId?: string | null;
  note?: string | null;
};

export type EarnTicketsResult = {
  ok: boolean;
  error: string | null;
  alreadyAwarded: boolean;
  balance: number | null;
  ledgerId: string | null;
};

export type SpendTicketsResult = {
  ok: boolean;
  error: string | null;
  balance: number | null;
  recommendationId: string | null;
  ledgerId: string | null;
};

export async function getRecommendationTicketBalance(userId: string): Promise<number> {
  try {
    const result = await db.execute(sql`
      select balance
      from public.recommendation_ticket_wallets
      where user_id = ${userId}::uuid
      limit 1
    `);
    const row = result.rows[0] as { balance?: number } | undefined;
    return Number(row?.balance ?? 0);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return 0;
    }
    throw error;
  }
}

export async function earnRecommendationTickets(
  input: EarnTicketsInput
): Promise<EarnTicketsResult> {
  const amount = Math.trunc(input.amount);
  if (amount <= 0) {
    return {
      ok: false,
      error: "Số phiếu không hợp lệ.",
      alreadyAwarded: false,
      balance: null,
      ledgerId: null
    };
  }

  try {
    const result = await db.execute(sql`
      with inserted_ledger as (
        insert into public.recommendation_ticket_ledger (
          user_id,
          amount,
          type,
          source_type,
          source_id,
          story_id,
          chapter_id,
          note
        )
        values (
          ${input.userId}::uuid,
          ${amount},
          'earn',
          ${input.sourceType},
          ${input.sourceId},
          ${input.storyId ?? null}::uuid,
          ${input.chapterId ?? null}::uuid,
          ${input.note ?? null}
        )
        on conflict (user_id, source_type, source_id) do nothing
        returning id
      ),
      wallet as (
        insert into public.recommendation_ticket_wallets (
          user_id,
          balance,
          lifetime_earned,
          updated_at
        )
        select
          ${input.userId}::uuid,
          ${amount},
          ${amount},
          now()
        from inserted_ledger
        on conflict (user_id) do update set
          balance = public.recommendation_ticket_wallets.balance + ${amount},
          lifetime_earned = public.recommendation_ticket_wallets.lifetime_earned + ${amount},
          updated_at = now()
        returning balance
      )
      select
        (select id from inserted_ledger) as ledger_id,
        (select balance from wallet) as balance
    `);

    const row = result.rows[0] as { ledger_id?: string; balance?: number } | undefined;
    if (!row?.ledger_id) {
      return {
        ok: true,
        error: null,
        alreadyAwarded: true,
        balance: await getRecommendationTicketBalance(input.userId),
        ledgerId: null
      };
    }

    return {
      ok: true,
      error: null,
      alreadyAwarded: false,
      balance: Number(row.balance ?? 0),
      ledgerId: String(row.ledger_id)
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        error: "Hệ thống Phiếu đề cử chưa sẵn sàng. Chạy migration 0029.",
        alreadyAwarded: false,
        balance: null,
        ledgerId: null
      };
    }
    throw error;
  }
}

export async function grantAdminRecommendationTickets(input: {
  userId: string;
  amount: number;
  adminUserId: string;
  note?: string | null;
}): Promise<EarnTicketsResult> {
  const amount = Math.trunc(input.amount);
  if (amount <= 0) {
    return {
      ok: false,
      error: "Số phiếu không hợp lệ.",
      alreadyAwarded: false,
      balance: null,
      ledgerId: null
    };
  }

  const grantId = crypto.randomUUID();

  try {
    const result = await db.execute(sql`
      with inserted_ledger as (
        insert into public.recommendation_ticket_ledger (
          user_id,
          amount,
          type,
          source_type,
          source_id,
          note
        )
        values (
          ${input.userId}::uuid,
          ${amount},
          'admin_adjustment',
          'admin_bonus',
          ${grantId},
          ${input.note ?? `Admin ${input.adminUserId}`}
        )
        returning id
      ),
      wallet as (
        insert into public.recommendation_ticket_wallets (
          user_id,
          balance,
          lifetime_earned,
          updated_at
        )
        select
          ${input.userId}::uuid,
          ${amount},
          ${amount},
          now()
        from inserted_ledger
        on conflict (user_id) do update set
          balance = public.recommendation_ticket_wallets.balance + ${amount},
          lifetime_earned = public.recommendation_ticket_wallets.lifetime_earned + ${amount},
          updated_at = now()
        returning balance
      )
      select
        (select id from inserted_ledger) as ledger_id,
        (select balance from wallet) as balance
    `);

    const row = result.rows[0] as { ledger_id?: string; balance?: number } | undefined;
    if (!row?.ledger_id) {
      return {
        ok: false,
        error: "Không thể cấp Phiếu đề cử.",
        alreadyAwarded: false,
        balance: null,
        ledgerId: null
      };
    }

    return {
      ok: true,
      error: null,
      alreadyAwarded: false,
      balance: Number(row.balance ?? 0),
      ledgerId: String(row.ledger_id)
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        error: "Hệ thống Phiếu đề cử chưa sẵn sàng.",
        alreadyAwarded: false,
        balance: null,
        ledgerId: null
      };
    }
    throw error;
  }
}

export async function spendRecommendationTickets(input: {
  userId: string;
  storyId: string;
  tickets: number;
}): Promise<SpendTicketsResult> {
  const tickets = Math.trunc(input.tickets);
  if (tickets <= 0) {
    return {
      ok: false,
      error: "Số phiếu phải lớn hơn 0.",
      balance: null,
      recommendationId: null,
      ledgerId: null
    };
  }

  const recommendationId = crypto.randomUUID();

  try {
    const result = await db.execute(sql`
      with debit as (
        update public.recommendation_ticket_wallets
        set
          balance = balance - ${tickets},
          lifetime_spent = lifetime_spent + ${tickets},
          updated_at = now()
        where user_id = ${input.userId}::uuid
          and balance >= ${tickets}
        returning balance
      ),
      ledger as (
        insert into public.recommendation_ticket_ledger (
          user_id,
          amount,
          type,
          source_type,
          source_id,
          story_id,
          note
        )
        select
          ${input.userId}::uuid,
          ${-tickets},
          'spend',
          'story_recommendation',
          ${recommendationId},
          ${input.storyId}::uuid,
          null
        from debit
        returning id
      ),
      rec as (
        insert into public.story_recommendations (
          id,
          story_id,
          user_id,
          tickets_spent,
          status
        )
        select
          ${recommendationId}::uuid,
          ${input.storyId}::uuid,
          ${input.userId}::uuid,
          ${tickets},
          'active'
        from ledger
        returning id
      )
      select
        (select balance from debit) as balance,
        (select id from rec) as recommendation_id,
        (select id from ledger) as ledger_id
    `);

    const row = result.rows[0] as {
      balance?: number;
      recommendation_id?: string;
      ledger_id?: string;
    } | undefined;

    if (!row?.recommendation_id) {
      return {
        ok: false,
        error: "Không đủ Phiếu đề cử.",
        balance: await getRecommendationTicketBalance(input.userId),
        recommendationId: null,
        ledgerId: null
      };
    }

    return {
      ok: true,
      error: null,
      balance: Number(row.balance ?? 0),
      recommendationId: String(row.recommendation_id),
      ledgerId: row.ledger_id ? String(row.ledger_id) : null
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        error: "Hệ thống Phiếu đề cử chưa sẵn sàng.",
        balance: null,
        recommendationId: null,
        ledgerId: null
      };
    }
    throw error;
  }
}
