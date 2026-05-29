import { getMonetizationConfig } from "@/lib/monetization/config";

export async function computeWithdrawalFeeVnd(amountVnd: number) {
  const { settings } = await getMonetizationConfig({ includePrivate: true });
  const raw = settings as Record<string, unknown>;
  const enabled = Boolean(raw["payout.withdrawal_fee_enabled"]);
  if (!enabled) {
    return 0;
  }
  const percent = Number(raw["payout.withdrawal_fee_percent"] ?? 0);
  const fixed = Number(raw["payout.withdrawal_fee_fixed_vnd"] ?? 0);
  const fromPercent = Number.isFinite(percent) ? (amountVnd * percent) / 100 : 0;
  const fromFixed = Number.isFinite(fixed) ? fixed : 0;
  return Number(Math.max(0, fromPercent + fromFixed).toFixed(2));
}
