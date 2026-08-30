import "server-only";

import { getRecommendationTicketsConfig } from "@/lib/recommendations/config";
import { earnRecommendationTickets } from "@/lib/recommendations/wallet";

export async function awardTicketsFromCoinTopup(input: {
  userId: string;
  topupOrderId: string;
  paidCoinAmount: number;
}) {
  const config = getRecommendationTicketsConfig();
  if (!config.enabled || !config.enableTopupBonusTickets) {
    return { ok: true as const, skipped: true, tickets: 0, balance: null };
  }

  const paidCoin = Math.max(0, Math.trunc(input.paidCoinAmount));
  if (paidCoin <= 0) {
    return { ok: true as const, skipped: true, tickets: 0, balance: null };
  }

  const tickets = paidCoin * config.ticketsPerPaidCoin;
  const result = await earnRecommendationTickets({
    userId: input.userId,
    amount: tickets,
    sourceType: "coin_topup",
    sourceId: input.topupOrderId,
    note: `${paidCoin} Xu -> ${tickets} Phiếu đề cử`
  });

  return {
    ok: result.ok,
    skipped: false,
    tickets,
    balance: result.balance,
    alreadyAwarded: result.alreadyAwarded,
    error: result.error
  };
}
