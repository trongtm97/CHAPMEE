/**
 * Coin top-up packages must be read from admin configuration/database only.
 * Do not hard-code packages in frontend user components.
 */
export {
  calculateTopupCoin,
  coinPerVnd
} from "@/lib/topup-packages/calculate";
export {
  TOPUP_BONUS_HARD_MAX,
  TOPUP_BONUS_RECOMMENDED_MAX,
  TOPUP_MAX_RECOMMENDED_PACKAGES
} from "@/lib/topup-packages/constants";
export {
  getActiveTopupPackages,
  getTopupPackageById,
  mapCoinPackToTopupPackagePublic
} from "@/lib/topup-packages/read";
export {
  buildTopupPackagePaymentSnapshot,
  FORBIDDEN_TOPUP_CLIENT_FIELDS,
  rejectForbiddenTopupClientFields,
  validateTopupPackageForPayment
} from "@/lib/topup-packages/validate-payment";
export {
  validateTopupPackageForm,
  validateTopupPackageId
} from "@/lib/topup-packages/validation";

export { getCoinPacksForAdmin as getTopupPackagesForAdmin } from "@/lib/supabase/coin-packs";

export async function validateTopupPackage(
  packageId: string
): Promise<{ ok: boolean; error?: string }> {
  const { validateTopupPackageForPayment } = await import(
    "@/lib/topup-packages/validate-payment"
  );
  const result = await validateTopupPackageForPayment(packageId);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
