/** PostgREST / data client compatibility types. */

export type { PostgrestRow, PostgrestRows } from "@/lib/db/postgrest-row";
import type { PostgrestRow, PostgrestRows } from "@/lib/db/postgrest-row";

export type PostgrestError = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

export type PostgrestResponse<T = PostgrestRows> = {
  data: T | null;
  error: PostgrestError | null;
  count?: number | null;
  status?: number;
  statusText?: string;
};

export type RealtimeChannel = {
  on: (
    event: string,
    filter: Record<string, unknown>,
    callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  ) => RealtimeChannel;
  subscribe: (callback?: (status: string) => void) => RealtimeChannel;
};

export type RealtimePostgresChangesPayload<T extends Record<string, unknown>> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T;
  schema: string;
  table: string;
};

export type DatabaseClient = {
  from: (table: string) => PostgrestQueryBuilder;
  rpc: (
    fn: string,
    params?: Record<string, unknown>
  ) => Promise<PostgrestResponse<unknown>>;
  auth: AuthClient;
  storage: StorageClient;
  channel: (name: string) => RealtimeChannel;
  removeChannel: (channel: RealtimeChannel) => Promise<void>;
};

export type DatabaseClientOptions<_Schema = string> = {
  db?: { timeout?: number };
  auth?: {
    autoRefreshToken?: boolean;
    persistSession?: boolean;
  };
};

export type AuthAdminClient = {
  createUser: (input: {
    email: string;
    password: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, unknown>;
  }) => Promise<{
    data: { user: AuthUser } | null;
    error: PostgrestError | null;
  }>;
  deleteUser: (
    userId: string
  ) => Promise<{ data: Record<string, never> | null; error: PostgrestError | null }>;
  getUserById: (userId: string) => Promise<{
    data: { user: AuthUser | null };
    error: PostgrestError | null;
  }>;
  listUsers: (input: {
    page?: number;
    perPage?: number;
  }) => Promise<{
    data: { users: AuthUser[] };
    error: PostgrestError | null;
  }>;
  updateUserById: (
    userId: string,
    input: {
      password?: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }
  ) => Promise<{ data: { user: AuthUser } | null; error: PostgrestError | null }>;
};

export type AuthClient = {
  admin: AuthAdminClient;
  getUser: () => Promise<{
    data: { user: AuthUser | null };
    error: PostgrestError | null;
  }>;
  getSession: () => Promise<{
    data: { session: AuthSession | null };
    error: PostgrestError | null;
  }>;
  signInWithPassword: (input: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => Promise<{
    data: { user: AuthUser | null; session: AuthSession | null };
    error: PostgrestError | null;
  }>;
  signUp: (input: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }) => Promise<{
    data: { user: AuthUser | null; session: AuthSession | null };
    error: PostgrestError | null;
  }>;
  signOut: () => Promise<{ error: PostgrestError | null }>;
};

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  /** Legacy db Auth field — optional on Better Auth shim. */
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  user: AuthUser;
};

export type StorageClient = {
  from: (bucket: string) => StorageBucketClient;
};

export type StorageBucketClient = {
  upload: (
    path: string,
    body: ArrayBuffer | Buffer | Blob | File | Uint8Array,
    options?: { contentType?: string; upsert?: boolean; cacheControl?: string }
  ) => Promise<{ data: { path: string } | null; error: PostgrestError | null }>;
  remove: (paths: string[]) => Promise<{ data: unknown; error: PostgrestError | null }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
  createSignedUrl: (
    path: string,
    expiresIn: number
  ) => Promise<{ data: { signedUrl: string } | null; error: PostgrestError | null }>;
};

export type PostgrestQueryBuilder = {
  select: (
    columns?: string,
    options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }
  ) => PostgrestFilterBuilder;
  insert: (
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { count?: "exact" }
  ) => PostgrestFilterBuilder;
  upsert: (
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean; count?: "exact" }
  ) => PostgrestFilterBuilder;
  update: (values: Record<string, unknown>) => PostgrestFilterBuilder;
  delete: (options?: { count?: "exact" }) => PostgrestFilterBuilder;
};

export type PostgrestFilterBuilder = PostgrestQueryBuilder & {
  eq: (column: string, value: unknown) => PostgrestFilterBuilder;
  neq: (column: string, value: unknown) => PostgrestFilterBuilder;
  gt: (column: string, value: unknown) => PostgrestFilterBuilder;
  gte: (column: string, value: unknown) => PostgrestFilterBuilder;
  lt: (column: string, value: unknown) => PostgrestFilterBuilder;
  lte: (column: string, value: unknown) => PostgrestFilterBuilder;
  like: (column: string, pattern: string) => PostgrestFilterBuilder;
  ilike: (column: string, pattern: string) => PostgrestFilterBuilder;
  is: (column: string, value: null | boolean) => PostgrestFilterBuilder;
  in: (column: string, values: unknown[]) => PostgrestFilterBuilder;
  contains: (column: string, value: unknown) => PostgrestFilterBuilder;
  containedBy: (column: string, value: unknown) => PostgrestFilterBuilder;
  or: (filters: string, options?: { foreignTable?: string }) => PostgrestFilterBuilder;
  not: (
    column: string,
    operator: string,
    value: unknown
  ) => PostgrestFilterBuilder;
  filter: (column: string, operator: string, value: string) => PostgrestFilterBuilder;
  match: (query: Record<string, unknown>) => PostgrestFilterBuilder;
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }
  ) => PostgrestFilterBuilder;
  limit: (count: number, options?: { foreignTable?: string }) => PostgrestFilterBuilder;
  range: (from: number, to: number, options?: { foreignTable?: string }) => PostgrestFilterBuilder;
  single: <T extends PostgrestRow = PostgrestRow>() => Promise<PostgrestResponse<T>>;
  maybeSingle: <T extends PostgrestRow = PostgrestRow>() => Promise<PostgrestResponse<T>>;
  throwOnError: () => PostgrestFilterBuilder;
  then: Promise<PostgrestResponse<PostgrestRows>>["then"];
};
