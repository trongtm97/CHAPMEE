import type { CalculatedTopupCoin } from "@/types/topup-package";

/**
 * Compute coin amounts from VND and bonus percent.
 * Uses `exchangeRateVnd` = VND per 1 coin (monetization setting `coin.exchange_rate_vnd`).
 */
export function calculateTopupCoin(
  amountVnd: number,
  bonusPercent: number,
  exchangeRateVnd: number
): CalculatedTopupCoin {
  const rate = exchangeRateVnd > 0 ? exchangeRateVnd : 1000;
  const safeAmount = Math.max(0, Math.floor(amountVnd));
  const safeBonus = Math.max(0, bonusPercent);
  const baseCoin = Math.floor(safeAmount / rate);
  const bonusCoin = Math.floor((baseCoin * safeBonus) / 100);
  return {
    baseCoin,
    bonusCoin,
    totalCoin: baseCoin + bonusCoin,
    bonusPercent: safeBonus
  };
}

export function coinPerVnd(exchangeRateVnd: number) {
  const rate = exchangeRateVnd > 0 ? exchangeRateVnd : 1000;
  return 1 / rate;
}
