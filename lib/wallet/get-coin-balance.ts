import type { UserWallet } from "@/types/wallet";

export function getTotalSpendableCoinBalance(wallet: Pick<UserWallet, "paid_coin_balance" | "bonus_coin_balance">) {
  return wallet.paid_coin_balance + wallet.bonus_coin_balance;
}

export function getTotalCoinBalance(
  wallet: Pick<UserWallet, "paid_coin_balance" | "bonus_coin_balance" | "locked_coin_balance">
) {
  return (
    wallet.paid_coin_balance + wallet.bonus_coin_balance + wallet.locked_coin_balance
  );
}
