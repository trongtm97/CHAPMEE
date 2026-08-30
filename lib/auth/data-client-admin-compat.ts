import { hashPassword } from "@better-auth/utils/password";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { ensureProfileForUser } from "@/lib/auth/ensure-profile";
import { syncAuthUserShim } from "@/lib/auth/sync-auth-user-shim";
import { db } from "@/lib/db";
import type { AuthAdminClient, AuthUser, PostgrestError } from "@/lib/db/types";

function toError(message: string): PostgrestError {
  return { message, code: "AUTH_ADMIN_ERROR" };
}

function mapUserRow(row: {
  id: string;
  email: string;
  name: string | null;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    user_metadata: row.name ? { display_name: row.name } : {}
  };
}

export function createDataClientAdminAuth(): AuthAdminClient {
  return {
    async createUser(input) {
      try {
        if (!input.password?.trim()) {
          return {
            data: null,
            error: toError("Password is required (min 8 characters)")
          };
        }
        const displayName =
          typeof input.user_metadata?.display_name === "string"
            ? input.user_metadata.display_name
            : input.email.split("@")[0];

        const result = await auth.api.signUpEmail({
          body: {
            email: input.email,
            password: input.password,
            name: displayName
          }
        });

        if (!result.user) {
          return {
            data: null,
            error: toError("Could not create user")
          };
        }

        if (input.email_confirm) {
          await db.execute(sql`
            update "user"
            set "emailVerified" = true, "updatedAt" = now()
            where id = ${result.user.id}
          `);
        }

        await syncAuthUserShim({ id: result.user.id, email: result.user.email });
        await ensureProfileForUser({
          userId: result.user.id,
          email: result.user.email,
          displayName
        });

        return {
          data: { user: mapUserRow(result.user) },
          error: null
        };
      } catch (error) {
        return {
          data: null,
          error: toError(error instanceof Error ? error.message : "Create user failed")
        };
      }
    },

    async updateUserById(userId, input) {
      try {
        if (input.password) {
          const hashed = await hashPassword(input.password);
          await db.execute(sql`
            update account
            set password = ${hashed}, "updatedAt" = now()
            where "userId" = ${userId} and "providerId" = 'credential'
          `);
        }
        if (input.email) {
          await db.execute(sql`
            update "user"
            set email = ${input.email}, "updatedAt" = now()
            where id = ${userId}
          `);
          await syncAuthUserShim({ id: userId, email: input.email });
        }
        const displayName =
          typeof input.user_metadata?.display_name === "string"
            ? input.user_metadata.display_name
            : undefined;
        if (displayName) {
          await db.execute(sql`
            update "user"
            set name = ${displayName}, "updatedAt" = now()
            where id = ${userId}
          `);
        }
        const got = await this.getUserById(userId);
        return { data: got.data.user ? { user: got.data.user } : null, error: null };
      } catch (error) {
        return {
          data: null,
          error: toError(error instanceof Error ? error.message : "Update user failed")
        };
      }
    },

    async deleteUser(userId) {
      try {
        await db.execute(sql`delete from auth.users where id = ${userId}::uuid`);
        await db.execute(sql`delete from "user" where id = ${userId}`);
        return { data: {}, error: null };
      } catch (error) {
        return {
          data: null,
          error: toError(error instanceof Error ? error.message : "Delete user failed")
        };
      }
    },

    async getUserById(userId) {
      try {
        const result = await db.execute(sql`
          select id, email, name
          from "user"
          where id = ${userId}
          limit 1
        `);
        const row = result.rows[0] as
          | { id: string; email: string; name: string | null }
          | undefined;
        if (!row) {
          return { data: { user: null }, error: null };
        }
        return { data: { user: mapUserRow(row) }, error: null };
      } catch (error) {
        return {
          data: { user: null },
          error: toError(error instanceof Error ? error.message : "Get user failed")
        };
      }
    },

    async listUsers({ page = 1, perPage = 200 }) {
      try {
        const offset = Math.max(0, (page - 1) * perPage);
        const result = await db.execute(sql`
          select id, email, name
          from "user"
          order by "createdAt" desc
          limit ${perPage} offset ${offset}
        `);
        const users = (result.rows as { id: string; email: string; name: string | null }[]).map(
          mapUserRow
        );
        return { data: { users }, error: null };
      } catch (error) {
        return {
          data: { users: [] },
          error: toError(error instanceof Error ? error.message : "List users failed")
        };
      }
    }
  };
}
