import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** Keeps legacy `auth.users` rows in sync for FK constraints from db-era migrations. */
export async function syncAuthUserShim(user: { id: string; email: string }) {
  await db.execute(sql`
    insert into auth.users (id, email, created_at, updated_at)
    values (${user.id}::uuid, ${user.email}, now(), now())
    on conflict (id) do update set email = excluded.email, updated_at = now()
  `);
}
