import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isReservedUsername
} from "@/lib/username/normalize-username";
import { validateUsername } from "@/lib/username/validate-username";

export async function suggestDefaultUsername(
  displayName: string,
  excludeUserId?: string | null
): Promise<string | null> {
  const base = normalizeUsername(displayName);
  if (base.length < USERNAME_MIN_LENGTH || isReservedUsername(base)) {
    return null;
  }

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const candidate =
      suffix === 0 ? base : `${base}${suffix}`.slice(0, USERNAME_MAX_LENGTH);

    if (candidate.length < USERNAME_MIN_LENGTH) {
      continue;
    }

    const result = await validateUsername(candidate, excludeUserId);
    if (result.valid && result.normalized) {
      return result.normalized;
    }

    if (result.error_code !== "taken") {
      continue;
    }
  }

  return null;
}
