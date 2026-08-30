import type { CalculatedTopupCoin } from "@/types/topup-package";

/**
 * Compute Xu amounts from VND and bonus percent.
 * ChapMee now uses 1 VND = 1 Xu for top-up packages.
 */
export function calculateTopupCoin(
  amountVnd: number,
  bonusPercent: number,
  exchangeRateVnd: number
): CalculatedTopupCoin {
  const safeAmount = Math.max(0, Math.floor(amountVnd));
  const safeBonus = Math.max(0, bonusPercent);
  const baseCoin = safeAmount;
  const bonusCoin = Math.floor((baseCoin * safeBonus) / 100);
  return {
    baseCoin,
    bonusCoin,
    totalCoin: baseCoin + bonusCoin,
    bonusPercent: safeBonus
  };
}

export function coinPerVnd(exchangeRateVnd: number) {
  return 1;
}
