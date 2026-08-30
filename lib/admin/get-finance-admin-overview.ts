import { createClient } from "@/lib/data/server";
import type { AdminFinanceOverview } from "@/types/admin";

export async function getFinanceAdminOverview(): Promise<{
  data: AdminFinanceOverview;
  error: string | null;
}> {
  const db = await createClient();

  const [{ data: payouts }, { data: wallets }] = await Promise.all([
    db.from("payout_requests").select("amount_vnd, status"),
    db
      .from("creator_wallets")
      .select("user_id, total_earned_vnd, available_revenue_vnd")
  ]);

  if (!payouts) {
    return {
      data: emptyOverview(),
      error: "Không tải được yêu cầu rút tiền."
    };
  }

  let pendingWithdrawalCount = 0;
  let pendingWithdrawalAmountVnd = 0;
  let completedWithdrawalAmountVnd = 0;

  for (const row of payouts) {
    const amount = Number(row.amount_vnd ?? 0);
    const status = String(row.status);

    if (status === "requested" || status === "under_review" || status === "approved" || status === "processing") {
      pendingWithdrawalCount += 1;
      pendingWithdrawalAmountVnd += amount;
    }

    if (status === "completed") {
      completedWithdrawalAmountVnd += amount;
    }
  }

  const creatorsWithRevenueCount = (wallets ?? []).filter(
    (w) => Number(w.total_earned_vnd ?? 0) > 0
  ).length;

  const anomalyFlags: string[] = [];
  const highLocked = (wallets ?? []).filter(
    (w) =>
      Number(w.available_revenue_vnd ?? 0) === 0 &&
      Number(w.total_earned_vnd ?? 0) > 500_000
  );

  if (pendingWithdrawalCount > 50) {
    anomalyFlags.push(`Có ${pendingWithdrawalCount} yêu cầu rút đang chờ xử lý.`);
  }

  if (highLocked.length > 10) {
    anomalyFlags.push(`${highLocked.length} ví creator có doanh thu nhưng số dư available = 0.`);
  }

  return {
    data: {
      pendingWithdrawalCount,
      pendingWithdrawalAmountVnd,
      completedWithdrawalAmountVnd,
      creatorsWithRevenueCount,
      anomalyFlags
    },
    error: null
  };
}

function emptyOverview(): AdminFinanceOverview {
  return {
    pendingWithdrawalCount: 0,
    pendingWithdrawalAmountVnd: 0,
    completedWithdrawalAmountVnd: 0,
    creatorsWithRevenueCount: 0,
    anomalyFlags: []
  };
}
