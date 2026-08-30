import { getPgPool } from "@/lib/db/pool";
import {
  isReservedUsername,
  isValidUsernameShape,
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH
} from "@/lib/username/normalize-username";

function fallbackBase(userId: string) {
  return `user${userId.replace(/-/g, "").slice(0, 8)}`.slice(0, USERNAME_MAX_LENGTH);
}

/** Profile cần gán hoặc sửa username (null, sai định dạng, reserved, hoặc trùng). */
export function profileNeedsUsername(username: string | null | undefined): boolean {
  const current = username?.trim().toLowerCase() ?? "";
  if (!current) {
    return true;
  }
  if (!isValidUsernameShape(current)) {
    return true;
  }
  if (isReservedUsername(current)) {
    return true;
  }
  return false;
}

export async function isProfileUsernameAvailable(
  username: string,
  excludeUserId: string
): Promise<boolean> {
  if (!isValidUsernameShape(username) || isReservedUsername(username)) {
    return false;
  }

  const pool = getPgPool();
  const { rows } = await pool.query<{ id: string }>(
    `select id from public.profiles
     where lower(username) = lower($1) and id <> $2::uuid
     limit 1`,
    [username, excludeUserId]
  );

  return rows.length === 0;
}

export async function suggestUsernameForProfile(
  displayName: string,
  excludeUserId: string
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

    if (await isProfileUsernameAvailable(candidate, excludeUserId)) {
      return candidate;
    }
  }

  return null;
}

async function resolveDisplayNameForUser(
  userId: string,
  displayName?: string | null,
  profileDisplayName?: string | null
): Promise<string> {
  const fromArg = displayName?.trim() || profileDisplayName?.trim() || "";
  if (fromArg) {
    return fromArg;
  }

  const pool = getPgPool();
  const { rows } = await pool.query<{ email: string; name: string | null }>(
    `select email, name from "user" where id = $1 limit 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) {
    return "";
  }

  return row.name?.trim() || row.email.split("@")[0]?.trim() || "";
}

/**
 * Chọn username khả dụng cho profile (chưa ghi DB).
 * Trả về username hiện tại nếu đã hợp lệ và không trùng.
 */
export async function allocateProfileUsername(
  userId: string,
  displayName?: string | null
): Promise<string | null> {
  const pool = getPgPool();
  const { rows } = await pool.query<{
    username: string | null;
    display_name: string | null;
  }>(`select username, display_name from public.profiles where id = $1::uuid`, [userId]);

  const profile = rows[0];
  if (!profile) {
    return null;
  }

  const current = profile.username?.trim().toLowerCase() ?? "";
  if (
    current &&
    isValidUsernameShape(current) &&
    !isReservedUsername(current) &&
    (await isProfileUsernameAvailable(current, userId))
  ) {
    return current;
  }

  const name = await resolveDisplayNameForUser(
    userId,
    displayName,
    profile.display_name
  );

  let allocated = name ? await suggestUsernameForProfile(name, userId) : null;

  if (!allocated) {
    const base = fallbackBase(userId);
    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const candidate =
        suffix === 0 ? base : `${base}${suffix}`.slice(0, USERNAME_MAX_LENGTH);
      if (await isProfileUsernameAvailable(candidate, userId)) {
        allocated = candidate;
        break;
      }
    }
  }

  return allocated;
}

export async function applyProfileUsername(
  userId: string,
  username: string
): Promise<boolean> {
  const pool = getPgPool();
  const result = await pool.query(
    `update public.profiles
     set username = $1, updated_at = now()
     where id = $2::uuid`,
    [username, userId]
  );

  return (result.rowCount ?? 0) > 0;
}
