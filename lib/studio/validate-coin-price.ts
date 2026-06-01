export const EVEN_COIN_ERROR = "Giá coin phải là số chẵn.";
export const INVALID_COIN_ERROR = "Giá coin phải là số nguyên không âm.";

export function validateStudioCoinPrice(
  value: number | null | undefined,
  options?: { allowFree?: boolean; required?: boolean }
): { ok: true; price: number | null } | { ok: false; error: string } {
  const allowFree = options?.allowFree ?? true;
  const required = options?.required ?? false;

  if (value == null || value === 0) {
    if (required) {
      return { ok: false, error: "Vui lòng nhập giá coin." };
    }
    return allowFree ? { ok: true, price: null } : { ok: false, error: INVALID_COIN_ERROR };
  }

  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, error: INVALID_COIN_ERROR };
  }

  if (value < 0) {
    return { ok: false, error: INVALID_COIN_ERROR };
  }

  if (value > 0 && value % 2 !== 0) {
    return { ok: false, error: EVEN_COIN_ERROR };
  }

  return { ok: true, price: value };
}
