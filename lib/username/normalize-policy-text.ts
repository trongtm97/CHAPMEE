export function normalizePolicyText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeDisplayNamePolicyText(value: string) {
  return normalizePolicyText(value.trim());
}
