"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { getRecommendationTicketsConfig } from "@/lib/recommendations/config";
import {
  getRecommendationTicketBalance,
  grantAdminRecommendationTickets
} from "@/lib/recommendations/wallet";

export async function getAdminRecommendationTicketsOverviewAction() {
  const guard = await requireAdminSettingsAccess("/admin/engagement/recommendation-tickets");
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, config: null, recentGrants: [] };
  }

  const config = getRecommendationTicketsConfig();

  try {
    const result = await db.execute(sql`
      select
        l.id,
        l.user_id,
        l.amount,
        l.note,
        l.created_at,
        p.username,
        p.display_name
      from public.recommendation_ticket_ledger l
      left join public.profiles p on p.id = l.user_id
      where l.source_type = 'admin_bonus'
      order by l.created_at desc
      limit 20
    `);

    const recentGrants = (
      result.rows as Array<{
        id: string;
        user_id: string;
        amount: number;
        note: string | null;
        created_at: string;
        username: string | null;
        display_name: string | null;
      }>
    ).map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      amount: Number(row.amount),
      note: row.note,
      createdAt: String(row.created_at),
      username: row.username,
      displayName: row.display_name
    }));

    return { ok: true as const, error: null, config, recentGrants };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: true as const,
        error: null,
        config,
        recentGrants: [] as Array<{
          id: string;
          userId: string;
          amount: number;
          note: string | null;
          createdAt: string;
          username: string | null;
          displayName: string | null;
        }>
      };
    }
    throw error;
  }
}

export async function grantRecommendationTicketsAction(formData: FormData) {
  const guard = await requireAdminSettingsAccess("/admin/engagement/recommendation-tickets");
  if (!guard.ok) {
    return { ok: false as const, message: guard.error };
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, message: "Thiếu userId hoặc số phiếu không hợp lệ." };
  }

  const result = await grantAdminRecommendationTickets({
    userId,
    amount: Math.trunc(amount),
    adminUserId: guard.context.userId,
    note
  });

  if (!result.ok) {
    return { ok: false as const, message: result.error ?? "Không thể cấp phiếu." };
  }

  await logAdminAction({
    action: "coin_grant",
    actorId: guard.context.userId,
    targetType: "recommendation_ticket_wallets",
    targetId: userId,
    metadata: {
      amount: Math.trunc(amount),
      balance: result.balance,
      ledgerId: result.ledgerId,
      note
    }
  });

  revalidatePath("/admin/engagement/recommendation-tickets");
  revalidatePath("/bang-xep-hang/duoc-de-cu");

  return {
    ok: true as const,
    message: `Đã cấp ${Math.trunc(amount)} Phiếu đề cử. Số dư user: ${result.balance?.toLocaleString("vi-VN")}.`
  };
}

export async function lookupRecommendationTicketBalanceAction(userId: string) {
  const guard = await requireAdminSettingsAccess("/admin/engagement/recommendation-tickets");
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, balance: null };
  }

  const trimmed = userId.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Thiếu userId.", balance: null };
  }

  const balance = await getRecommendationTicketBalance(trimmed);
  return { ok: true as const, error: null, balance };
}
