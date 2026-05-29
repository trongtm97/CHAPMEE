import { allocateCoinSpendFifo } from "@/lib/supabase/coin-lots";

export async function allocateCoinSpend(input: {
  userId: string;
  amountCoin: number;
  spendRule?: "bonus_first" | "paid_first";
  applyDeduction?: boolean;
}) {
  return allocateCoinSpendFifo(input);
}
