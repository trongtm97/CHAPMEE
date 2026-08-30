import { createClient } from "@/lib/data/server";

export async function getCreatorEarningAggregates(creatorUserId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_earning_transactions")
    .select(
      "gross_amount_vnd, platform_fee_vnd, payment_processing_fee_vnd, tax_or_adjustment_vnd, creator_net_amount_vnd"
    )
    .eq("creator_user_id", creatorUserId)
    .eq("status", "settled");

  if (error) {
    return {
      totalGrossRevenueVnd: 0,
      totalFeesDeductedVnd: 0,
      totalNetReceivedVnd: 0,
      error: error.message
    };
  }

  let totalGrossRevenueVnd = 0;
  let totalFeesDeductedVnd = 0;
  let totalNetReceivedVnd = 0;

  for (const row of data ?? []) {
    totalGrossRevenueVnd += Number(row.gross_amount_vnd ?? 0);
    totalFeesDeductedVnd +=
      Number(row.platform_fee_vnd ?? 0) +
      Number(row.payment_processing_fee_vnd ?? 0) +
      Number(row.tax_or_adjustment_vnd ?? 0);
    totalNetReceivedVnd += Number(row.creator_net_amount_vnd ?? 0);
  }

  return { totalGrossRevenueVnd, totalFeesDeductedVnd, totalNetReceivedVnd, error: null };
}
