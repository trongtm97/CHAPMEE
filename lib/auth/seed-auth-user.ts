import { randomUUID } from "node:crypto";
import { hashPassword } from "@better-auth/utils/password";
import { sql } from "drizzle-orm";
import { syncAuthUserShim } from "@/lib/auth/sync-auth-user-shim";
import { db } from "@/lib/db";

/** Script-safe auth user lookup (no Next.js request / cookies). */
export async function findAuthUserIdByEmail(email: string) {
  const result = await db.execute(sql`
    select id from "user" where lower(email) = lower(${email}) limit 1
  `);
  const row = result.rows[0] as { id: string } | undefined;
  return row?.id;
}

export async function resetSeedAuthPassword(userId: string, password: string) {
  const hashed = await hashPassword(password);
  const updated = await db.execute(sql`
    update account
    set password = ${hashed}, "updatedAt" = now()
    where "userId" = ${userId} and "providerId" = 'credential'
    returning id
  `);

  if ((updated.rowCount ?? 0) === 0) {
    await db.execute(sql`
      insert into account (
        id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
      )
      values (
        ${randomUUID()},
        ${userId},
        'credential',
        ${userId},
        ${hashed},
        now(),
        now()
      )
    `);
  }
}

/**
 * Creates or updates a Better Auth credential user for local seed / RBAC scripts.
 */
export async function upsertSeedAuthUser(input: {
  email: string;
  password: string;
  displayName: string;
  emailVerified?: boolean;
}) {
  const existingId = await findAuthUserIdByEmail(input.email);

  if (existingId) {
    await resetSeedAuthPassword(existingId, input.password);
    if (input.emailVerified ?? true) {
      await db.execute(sql`
        update "user"
        set "emailVerified" = true, "updatedAt" = now()
        where id = ${existingId}
      `);
    }
    await db.execute(sql`
      update "user"
      set name = ${input.displayName}, "updatedAt" = now()
      where id = ${existingId}
    `);
    await syncAuthUserShim({ id: existingId, email: input.email });
    return { userId: existingId, created: false };
  }

  const userId = randomUUID();
  const hashed = await hashPassword(input.password);

  await db.execute(sql`
    insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    values (
      ${userId},
      ${input.displayName},
      ${input.email},
      ${input.emailVerified ?? true},
      now(),
      now()
    )
  `);

  await db.execute(sql`
    insert into account (
      id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
    )
    values (
      ${randomUUID()},
      ${userId},
      'credential',
      ${userId},
      ${hashed},
      now(),
      now()
    )
  `);

  await syncAuthUserShim({ id: userId, email: input.email });
  return { userId, created: true };
}
