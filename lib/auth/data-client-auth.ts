import { headers } from "next/headers";
import type { AuthClient, AuthSession, AuthUser, PostgrestError } from "@/lib/db/types";
import { auth } from "@/lib/auth/auth";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { syncAuthUserShim } from "@/lib/auth/sync-auth-user-shim";
import { ensureProfileForUser } from "@/lib/auth/ensure-profile";

function toAuthUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      display_name: user.name ?? undefined,
      avatar_url: user.image ?? undefined
    }
  };
}

function toPostgrestError(message: string, code = "AUTH_ERROR"): PostgrestError {
  return { message, code };
}

const adminStub: AuthClient["admin"] = {
  createUser: async () => ({
    data: null,
    error: { message: "Use createAdminClient() for admin.createUser", code: "AUTH_ADMIN_ONLY" }
  }),
  deleteUser: async () => ({
    data: null,
    error: { message: "Use createAdminClient()", code: "AUTH_ADMIN_ONLY" }
  }),
  getUserById: async () => ({
    data: { user: null },
    error: { message: "Use createAdminClient()", code: "AUTH_ADMIN_ONLY" }
  }),
  listUsers: async () => ({
    data: { users: [] },
    error: { message: "Use createAdminClient()", code: "AUTH_ADMIN_ONLY" }
  }),
  updateUserById: async () => ({
    data: null,
    error: { message: "Use createAdminClient()", code: "AUTH_ADMIN_ONLY" }
  })
};

export function createAuthNamespace(): AuthClient {
  return {
    admin: adminStub,
    async getUser() {
      try {
        const user = await getSessionUser();
        if (!user) {
          return { data: { user: null }, error: null };
        }
        return { data: { user: toAuthUser(user) }, error: null };
      } catch (error) {
        return {
          data: { user: null },
          error: toPostgrestError(
            error instanceof Error ? error.message : "Could not load session"
          )
        };
      }
    },

    async getSession() {
      try {
        const user = await getSessionUser();
        if (!user) {
          return { data: { session: null }, error: null };
        }
        const authSession: AuthSession = {
          access_token: user.token,
          user: toAuthUser(user)
        };
        return { data: { session: authSession }, error: null };
      } catch (error) {
        return {
          data: { session: null },
          error: toPostgrestError(
            error instanceof Error ? error.message : "Could not load session"
          )
        };
      }
    },

    async signInWithPassword({ email, password }) {
      try {
        const result = await auth.api.signInEmail({
          body: { email, password }
        });
        if (!result.user) {
          return {
            data: { user: null, session: null },
            error: toPostgrestError("Invalid credentials")
          };
        }
        await syncAuthUserShim(result.user);
        await ensureProfileForUser({
          userId: result.user.id,
          email: result.user.email,
          displayName: result.user.name
        });
        const user = toAuthUser(result.user);
        const session: AuthSession = {
          access_token: result.token,
          user
        };
        return { data: { user, session }, error: null };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: toPostgrestError(
            error instanceof Error ? error.message : "Sign in failed"
          )
        };
      }
    },

    async signUp({ email, password, options }) {
      try {
        const displayName =
          typeof options?.data?.display_name === "string"
            ? options.data.display_name
            : undefined;
        const result = await auth.api.signUpEmail({
          body: {
            email,
            password,
            name: displayName ?? email.split("@")[0] ?? "Reader"
          }
        });
        if (!result.user) {
          return {
            data: { user: null, session: null },
            error: toPostgrestError("Could not create account")
          };
        }
        await syncAuthUserShim(result.user);
        await ensureProfileForUser({
          userId: result.user.id,
          email: result.user.email,
          displayName: displayName ?? result.user.name
        });
        const user = toAuthUser(result.user);
        const session: AuthSession | null = result.token
          ? { access_token: result.token, user }
          : null;
        return { data: { user, session }, error: null };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: toPostgrestError(
            error instanceof Error ? error.message : "Sign up failed"
          )
        };
      }
    },

    async signOut() {
      try {
        const headerStore = await headers();
        await auth.api.signOut({ headers: headerStore });
        return { error: null };
      } catch (error) {
        return {
          error: toPostgrestError(
            error instanceof Error ? error.message : "Sign out failed"
          )
        };
      }
    }
  };
}
