import { getAdminCoinGrantMaxPerAction } from "@/lib/admin/get-admin-coin-grant-limit";

export const ADMIN_COIN_BATCH_MAX_USERS = 100;
export const ADMIN_COIN_BATCH_MAX_TOTAL = 100_000;
export const ADMIN_COIN_HIGH_AMOUNT_WARNING = 5_000;

export async function getAdminCoinLimits() {
  const maxPerUserPerAction = await getAdminCoinGrantMaxPerAction();
  return {
    maxPerUserPerAction,
    maxBatchUsers: ADMIN_COIN_BATCH_MAX_USERS,
    maxBatchTotalCoins: ADMIN_COIN_BATCH_MAX_TOTAL,
    highAmountWarning: ADMIN_COIN_HIGH_AMOUNT_WARNING
  };
}
