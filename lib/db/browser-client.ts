"use client";

import { authClient } from "@/lib/auth/browser-auth";
import type {
  AuthClient,
  AuthSession,
  AuthUser,
  DatabaseClient,
  PostgrestError,
  PostgrestResponse
} from "@/lib/db/types";
import { createTableQuery } from "@/lib/db/postgrest/query-builder";

const SAFE_BROWSER_POSTGREST_PATH = "/api/postgrest";

function isLoopbackOrPrivateHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return false;

  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  if (/^10\.\d+\.\d+\.\d+$/.test(normalized)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(normalized)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(normalized)) return true;

  const private172 = normalized.match(/^172\.(\d{1,3})\.\d+\.\d+$/);
  if (private172) {
    const secondOctet = Number(private172[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

function isLocalDevHostname(hostname: string) {
  return isLoopbackOrPrivateHostname(hostname);
}

function getPostgrestUrl() {
  const configured = process.env.NEXT_PUBLIC_POSTGREST_URL?.trim();

  if (typeof window === "undefined") {
    return configured || SAFE_BROWSER_POSTGREST_PATH;
  }

  if (!configured) {
    return SAFE_BROWSER_POSTGREST_PATH;
  }

  if (configured.startsWith("/")) {
    return configured;
  }

  try {
    const parsed = new URL(configured, window.location.origin);
    if (
      isLoopbackOrPrivateHostname(parsed.hostname) &&
      !isLocalDevHostname(window.location.hostname)
    ) {
      return SAFE_BROWSER_POSTGREST_PATH;
    }
  } catch {
    return SAFE_BROWSER_POSTGREST_PATH;
  }

  return configured;
}

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

function toError(message: string | undefined): PostgrestError {
  return { message: message ?? "Auth error", code: "AUTH_ERROR" };
}

async function ensureProfileAfterAuth(input: {
  displayName?: string;
  token?: string | null;
}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.token) {
    headers.Authorization = `Bearer ${input.token}`;
  }

  const response = await fetch("/api/auth/ensure-profile", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ displayName: input.displayName })
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not initialize profile");
  }
}

function createBrowserAuth(): AuthClient {
  const adminStub = {
    createUser: async () => ({
      data: null,
      error: { message: "Admin auth is server-only", code: "AUTH_ADMIN_ONLY" }
    }),
    deleteUser: async () => ({
      data: null,
      error: { message: "Admin auth is server-only", code: "AUTH_ADMIN_ONLY" }
    }),
    getUserById: async () => ({
      data: { user: null },
      error: { message: "Admin auth is server-only", code: "AUTH_ADMIN_ONLY" }
    }),
    listUsers: async () => ({
      data: { users: [] },
      error: { message: "Admin auth is server-only", code: "AUTH_ADMIN_ONLY" }
    }),
    updateUserById: async () => ({
      data: null,
      error: { message: "Admin auth is server-only", code: "AUTH_ADMIN_ONLY" }
    })
  };

  return {
    admin: adminStub,
    async getUser() {
      const { data, error } = await authClient.getSession();
      if (error) {
        return { data: { user: null }, error: toError(error.message) };
      }
      if (!data?.user) {
        return { data: { user: null }, error: null };
      }
      return { data: { user: toAuthUser(data.user) }, error: null };
    },
    async getSession() {
      const { data, error } = await authClient.getSession();
      if (error) {
        return { data: { session: null }, error: toError(error.message) };
      }
      if (!data?.session || !data.user) {
        return { data: { session: null }, error: null };
      }
      const session: AuthSession = {
        access_token: data.session.token,
        user: toAuthUser(data.user)
      };
      return { data: { session }, error: null };
    },
    async signInWithPassword({ email, password, rememberMe = true }) {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
        rememberMe
      });
      if (error) {
        return {
          data: { user: null, session: null },
          error: toError(error.message)
        };
      }
      if (!data?.user) {
        return {
          data: { user: null, session: null },
          error: toError("Invalid credentials")
        };
      }
      await ensureProfileAfterAuth({ token: data.token });
      const user = toAuthUser(data.user);
      const session: AuthSession = {
        access_token: data.token,
        user
      };
      return { data: { user, session }, error: null };
    },
    async signUp({ email, password, options }) {
      const displayName =
        typeof options?.data?.display_name === "string"
          ? options.data.display_name
          : undefined;
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name: displayName ?? email.split("@")[0] ?? "Reader"
      });
      if (error) {
        return {
          data: { user: null, session: null },
          error: toError(error.message)
        };
      }
      if (!data?.user) {
        return {
          data: { user: null, session: null },
          error: toError("Could not create account")
        };
      }
      const user = toAuthUser(data.user);
      const session: AuthSession | null = data.token
        ? { access_token: data.token, user }
        : null;
      if (data.token) {
        await ensureProfileAfterAuth({ displayName, token: data.token });
      }
      return { data: { user, session }, error: null };
    },
    async signOut() {
      const { error } = await authClient.signOut();
      return { error: error ? toError(error.message) : null };
    }
  };
}

export function createBrowserDatabaseClient(): DatabaseClient {
  const baseUrl = getPostgrestUrl();
  const headers: Record<string, string> = {};

  return {
    from(table: string) {
      return createTableQuery(baseUrl, headers, table);
    },
    async rpc(fn, params) {
      const response = await fetch(`/api/internal/rpc/${fn}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params ?? {})
      });
      const json = (await response.json()) as PostgrestResponse;
      return json;
    },
    auth: createBrowserAuth(),
    storage: {
      from() {
        throw new Error("Direct storage access is server-only. Use /api/media routes.");
      }
    },
    channel() {
      const channel = {
        on() {
          return channel;
        },
        subscribe() {
          return channel;
        }
      };
      return channel;
    },
    async removeChannel() {
      return undefined;
    }
  };
}
