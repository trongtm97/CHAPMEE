import { createStorageNamespace } from "@/lib/storage/data-client-storage";
import type { AuthClient } from "@/lib/db/types";
import { createTableQuery } from "@/lib/db/postgrest/query-builder";
import { callRpc } from "@/lib/db/postgrest/rpc";
import type { DatabaseClient, RealtimeChannel } from "@/lib/db/types";

function createLazyAuthNamespace(): AuthClient {
  const admin = {
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

  return {
    admin,
    getUser: async () => {
      const { createAuthNamespace } = await import("@/lib/auth/data-client-auth");
      return createAuthNamespace().getUser();
    },
    getSession: async () => {
      const { createAuthNamespace } = await import("@/lib/auth/data-client-auth");
      return createAuthNamespace().getSession();
    },
    signInWithPassword: async (input) => {
      const { createAuthNamespace } = await import("@/lib/auth/data-client-auth");
      return createAuthNamespace().signInWithPassword(input);
    },
    signUp: async (input) => {
      const { createAuthNamespace } = await import("@/lib/auth/data-client-auth");
      return createAuthNamespace().signUp(input);
    },
    signOut: async () => {
      const { createAuthNamespace } = await import("@/lib/auth/data-client-auth");
      return createAuthNamespace().signOut();
    }
  };
}

function createNoopRealtimeChannel(): RealtimeChannel {
  const channel: RealtimeChannel = {
    on() {
      return channel;
    },
    subscribe() {
      return channel;
    }
  };
  return channel;
}

function getPostgrestUrl() {
  return (
    process.env.POSTGREST_URL ??
    process.env.CHAPMEE_POSTGREST_URL ??
    "http://127.0.0.1:54321"
  );
}

function getPostgrestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const role =
    process.env.POSTGREST_SERVICE_ROLE ?? process.env.PGREST_SERVICE_ROLE;
  if (role) {
    headers.Authorization = `Bearer ${role}`;
  }
  return headers;
}

export function createDatabaseClient(options?: {
  headers?: Record<string, string>;
}): DatabaseClient {
  const baseUrl = getPostgrestUrl();
  const headers = { ...getPostgrestHeaders(), ...options?.headers };

  return {
    from(table: string) {
      return createTableQuery(baseUrl, headers, table);
    },
    rpc(fn, params) {
      return callRpc(fn, params ?? {}, { baseUrl, headers });
    },
    auth: createLazyAuthNamespace(),
    storage: createStorageNamespace(),
    channel() {
      return createNoopRealtimeChannel();
    },
    async removeChannel() {
      return undefined;
    }
  };
}
