import { ADMIN_COIN_HIGH_AMOUNT_WARNING } from "@/lib/admin/coin-limits";

export const ADMIN_COIN_DANGER_CONFIRM_TEXT = "CONFIRM";

export function requiresDangerConfirm(input: {
  coinType: "paid" | "bonus";
  amount: number;
  isBulk?: boolean;
  highAmountThreshold?: number;
}) {
  const threshold = input.highAmountThreshold ?? ADMIN_COIN_HIGH_AMOUNT_WARNING;
  return (
    input.coinType === "paid" ||
    input.amount > threshold ||
    input.isBulk === true
  );
}

export function validateDangerConfirmToken(token: string | null | undefined) {
  return token?.trim() === ADMIN_COIN_DANGER_CONFIRM_TEXT;
}
