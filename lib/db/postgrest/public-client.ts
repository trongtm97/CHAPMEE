import { createTableQuery } from "@/lib/db/postgrest/query-builder";
import type { DatabaseClient, PostgrestError, PostgrestResponse } from "@/lib/db/types";

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

function getPostgrestUrl() {
  const serverUrl = process.env.POSTGREST_URL?.trim();
  const browserUrl = process.env.NEXT_PUBLIC_POSTGREST_URL?.trim();

  if (typeof window === "undefined") {
    return serverUrl || browserUrl || SAFE_BROWSER_POSTGREST_PATH;
  }

  if (!browserUrl) {
    return SAFE_BROWSER_POSTGREST_PATH;
  }

  if (browserUrl.startsWith("/")) {
    return browserUrl;
  }

  try {
    const parsed = new URL(browserUrl, window.location.origin);
    if (
      isLoopbackOrPrivateHostname(parsed.hostname) &&
      !isLoopbackOrPrivateHostname(window.location.hostname)
    ) {
      return SAFE_BROWSER_POSTGREST_PATH;
    }
  } catch {
    return SAFE_BROWSER_POSTGREST_PATH;
  }

  return browserUrl;
}

async function callRpcHttp(
  baseUrl: string,
  fn: string,
  params: Record<string, unknown> = {}
): Promise<PostgrestResponse> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rpc/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(params)
    });
    const text = await response.text();
    if (!response.ok) {
      const error: PostgrestError = {
        message: text || response.statusText,
        code: String(response.status)
      };
      return { data: null, error };
    }
    if (!text) {
      return { data: null, error: null };
    }
    return { data: JSON.parse(text), error: null };
  } catch (cause) {
    return {
      data: null,
      error: {
        message: cause instanceof Error ? cause.message : String(cause),
        code: "FETCH_ERROR"
      }
    };
  }
}

function createNoopChannel() {
  const channel = {
    on() {
      return channel;
    },
    subscribe() {
      return channel;
    }
  };
  return channel;
}

/** PostgREST-only client safe for public/cached reads (no Node pg / Better Auth imports). */
export function createPostgrestPublicClient(): DatabaseClient {
  const baseUrl = getPostgrestUrl();
  const headers: Record<string, string> = {};

  return {
    from(table: string) {
      return createTableQuery(baseUrl, headers, table);
    },
    rpc(fn, params) {
      return callRpcHttp(baseUrl, fn, params ?? {});
    },
    auth: {
      admin: {
        createUser: async () => ({
          data: null,
          error: { message: "Admin auth is server-only", code: "AUTH_ADMIN_ONLY" }
        }),
        deleteUser: async () => ({
          data: null,
          error: { message: "Admin auth is server-only", code: "AUTH_ADMIN_ONLY" }
        }),
        getUserById: async () => ({ data: { user: null }, error: null }),
        listUsers: async () => ({ data: { users: [] }, error: null }),
        updateUserById: async () => ({
          data: null,
          error: { message: "Admin auth is server-only", code: "AUTH_ADMIN_ONLY" }
        })
      },
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signInWithPassword() {
        return {
          data: { user: null, session: null },
          error: { message: "Auth is server-only", code: "AUTH_SERVER_ONLY" }
        };
      },
      async signUp() {
        return {
          data: { user: null, session: null },
          error: { message: "Auth is server-only", code: "AUTH_SERVER_ONLY" }
        };
      },
      async signOut() {
        return { error: null };
      }
    },
    storage: {
      from() {
        throw new Error("Storage is server-only");
      }
    },
    channel() {
      return createNoopChannel();
    },
    async removeChannel() {
      return undefined;
    }
  };
}
