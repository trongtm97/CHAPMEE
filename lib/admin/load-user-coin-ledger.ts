"use server";

import { assertPermission } from "@/lib/auth/require-permission";
import { getUserCoinLedger } from "@/lib/coins/get-user-coin-ledger";

export async function loadUserCoinLedgerAction(userId: string) {
  await assertPermission("admin.user.view");
  return getUserCoinLedger({ userId, limit: 40 });
}
