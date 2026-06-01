export const TOPUP_BONUS_RECOMMENDED_MAX = 15;
export const TOPUP_BONUS_HARD_MAX = 30;
export const TOPUP_AMOUNT_STEP_VND = 1000;
export const TOPUP_MAX_RECOMMENDED_PACKAGES = 2;

export const TOPUP_PACKAGE_AUDIT_ACTIONS = {
  create: "create",
  update: "update",
  toggle: "toggle",
  delete: "delete",
  duplicate: "duplicate",
  reorder: "reorder",
  setRecommended: "set_recommended"
} as const;
