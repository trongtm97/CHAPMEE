import type {
  PostgrestError,
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
  PostgrestResponse,
  PostgrestRow,
  PostgrestRows
} from "@/lib/db/types";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

type BuilderState = {
  table: string;
  method: Method;
  select?: string;
  body?: unknown;
  params: URLSearchParams;
  headers: Record<string, string>;
  head?: boolean;
  count?: "exact" | "planned" | "estimated";
  singleRow?: boolean;
  throwOnErrorFlag?: boolean;
};

function toError(status: number, body: unknown): PostgrestError {
  if (body && typeof body === "object" && "message" in body) {
    const record = body as PostgrestError;
    return {
      message: record.message ?? `HTTP ${status}`,
      details: record.details,
      hint: record.hint,
      code: record.code ?? String(status)
    };
  }
  return { message: `HTTP ${status}`, code: String(status) };
}

function encodeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return `(${value.map((v) => String(v).replace(/,/g, "\\,")).join(",")})`;
  }
  // Do not encodeURIComponent here — URLSearchParams encodes once for the HTTP URL.
  // Double-encoding breaks timestamptz filters (colons become literal %3A in Postgres).
  return String(value);
}

export class PostgrestHttpBuilder implements PostgrestFilterBuilder {
  private asFilter(): PostgrestFilterBuilder {
    return this as unknown as PostgrestFilterBuilder;
  }
  private state: BuilderState;

  constructor(
    private readonly baseUrl: string,
    private readonly defaultHeaders: Record<string, string>,
    table: string,
    initial?: Partial<BuilderState>
  ) {
    this.state = {
      table,
      method: "GET",
      params: new URLSearchParams(),
      headers: {},
      ...initial
    };
  }

  select(columns = "*", options?: { count?: BuilderState["count"]; head?: boolean }): PostgrestFilterBuilder {
    this.state.select = columns;
    if (options?.count) this.state.count = options.count;
    if (options?.head) this.state.head = true;
    // Keep POST/PATCH/DELETE for insert().select() / update().select() chains.
    if (!this.state.body) {
      this.state.method = "GET";
    }
    return this.asFilter();
  }

  insert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { count?: "exact" }
  ): PostgrestFilterBuilder {
    this.state.method = "POST";
    this.state.body = values;
    if (options?.count) this.state.count = options.count;
    this.state.headers["Prefer"] = "return=representation";
    return this.asFilter();
  }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean; count?: "exact" }
  ): PostgrestFilterBuilder {
    this.state.method = "POST";
    this.state.body = values;
    const prefer = ["resolution=merge-duplicates", "return=representation"];
    if (options?.ignoreDuplicates) {
      prefer[0] = "resolution=ignore-duplicates";
    }
    this.state.headers["Prefer"] = prefer.join(",");
    if (options?.onConflict) {
      this.state.params.set("on_conflict", options.onConflict);
    }
    if (options?.count) this.state.count = options.count;
    return this.asFilter();
  }

  update(values: Record<string, unknown>): PostgrestFilterBuilder {
    this.state.method = "PATCH";
    this.state.body = values;
    this.state.headers["Prefer"] = "return=representation";
    return this.asFilter();
  }

  delete(options?: { count?: "exact" }): PostgrestFilterBuilder {
    this.state.method = "DELETE";
    if (options?.count) this.state.count = options.count;
    return this.asFilter();
  }

  eq(column: string, value: unknown): PostgrestFilterBuilder {
    this.state.params.set(column, `eq.${encodeValue(value)}`);
    return this.asFilter();
  }

  neq(column: string, value: unknown) {
    this.state.params.set(column, `neq.${encodeValue(value)}`);
    return this.asFilter();
  }

  gt(column: string, value: unknown) {
    this.state.params.set(column, `gt.${encodeValue(value)}`);
    return this.asFilter();
  }

  gte(column: string, value: unknown) {
    this.state.params.set(column, `gte.${encodeValue(value)}`);
    return this.asFilter();
  }

  lt(column: string, value: unknown) {
    this.state.params.set(column, `lt.${encodeValue(value)}`);
    return this.asFilter();
  }

  lte(column: string, value: unknown) {
    this.state.params.set(column, `lte.${encodeValue(value)}`);
    return this.asFilter();
  }

  like(column: string, pattern: string) {
    this.state.params.set(column, `like.${encodeValue(pattern)}`);
    return this.asFilter();
  }

  ilike(column: string, pattern: string) {
    this.state.params.set(column, `ilike.${encodeValue(pattern)}`);
    return this.asFilter();
  }

  is(column: string, value: null | boolean) {
    this.state.params.set(column, `is.${encodeValue(value)}`);
    return this.asFilter();
  }

  in(column: string, values: unknown[]) {
    this.state.params.set(column, `in.${encodeValue(values)}`);
    return this.asFilter();
  }

  contains(column: string, value: unknown) {
    this.state.params.set(column, `cs.${encodeValue(JSON.stringify(value))}`);
    return this.asFilter();
  }

  containedBy(column: string, value: unknown) {
    this.state.params.set(column, `cd.${encodeValue(JSON.stringify(value))}`);
    return this.asFilter();
  }

  or(filters: string, options?: { foreignTable?: string }) {
    const key = options?.foreignTable ? `${options.foreignTable}.or` : "or";
    this.state.params.set(key, `(${filters})`);
    return this.asFilter();
  }

  not(column: string, operator: string, value: unknown) {
    this.state.params.set(column, `not.${operator}.${encodeValue(value)}`);
    return this.asFilter();
  }

  filter(column: string, operator: string, value: string) {
    this.state.params.set(column, `${operator}.${value}`);
    return this.asFilter();
  }

  match(query: Record<string, unknown>) {
    for (const [column, value] of Object.entries(query)) {
      this.eq(column, value);
    }
    return this.asFilter();
  }

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }
  ) {
    const dir = options?.ascending === false ? "desc" : "asc";
    const nulls =
      options?.nullsFirst === true ? ".nullsfirst" : options?.nullsFirst === false ? ".nullslast" : "";
    const key = options?.foreignTable ? `${options.foreignTable}.order` : "order";
    const existing = this.state.params.get(key);
    const next = `${column}.${dir}${nulls}`;
    this.state.params.set(key, existing ? `${existing},${next}` : next);
    return this.asFilter();
  }

  limit(count: number, options?: { foreignTable?: string }) {
    const key = options?.foreignTable ? `${options.foreignTable}.limit` : "limit";
    this.state.params.set(key, String(count));
    return this.asFilter();
  }

  range(from: number, to: number, options?: { foreignTable?: string }) {
    const key = options?.foreignTable ? `${options.foreignTable}.offset` : "offset";
    this.state.params.set(key, String(from));
    const limitKey = options?.foreignTable ? `${options.foreignTable}.limit` : "limit";
    this.state.params.set(limitKey, String(to - from + 1));
    return this.asFilter();
  }

  single<T extends PostgrestRow = PostgrestRow>(): Promise<PostgrestResponse<T>> {
    this.state.singleRow = true;
    this.state.headers["Accept"] = "application/vnd.pgrst.object+json";
    return this.execute<T>();
  }

  maybeSingle<T extends PostgrestRow = PostgrestRow>(): Promise<PostgrestResponse<T>> {
    this.state.singleRow = true;
    return this.execute<T>();
  }

  throwOnError() {
    this.state.throwOnErrorFlag = true;
    return this.asFilter();
  }

  then<TResult1 = PostgrestResponse<PostgrestRows>, TResult2 = never>(
    onfulfilled?: ((value: PostgrestResponse<PostgrestRows>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private buildUrl(): string {
    const params = new URLSearchParams(this.state.params);
    if (this.state.select) {
      params.set("select", this.state.select);
    }
    const qs = params.toString();
    return `${this.baseUrl.replace(/\/$/, "")}/${this.state.table}${qs ? `?${qs}` : ""}`;
  }

  private async execute<T extends PostgrestRow | PostgrestRows | null = PostgrestRows>(): Promise<
    PostgrestResponse<T>
  > {
    const url = this.buildUrl();
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...this.state.headers,
      Accept: this.state.headers.Accept ?? "application/json"
    };

    if (this.state.count) {
      headers.Prefer = [headers.Prefer, `count=${this.state.count}`].filter(Boolean).join(",");
    }
    if (this.state.head) {
      headers.Prefer = [headers.Prefer, "return=minimal"].filter(Boolean).join(",");
    }

    const init: RequestInit = {
      method: this.state.head ? "HEAD" : this.state.method,
      headers
    };

    if (
      this.state.body !== undefined &&
      this.state.method !== "GET" &&
      !this.state.head
    ) {
      init.body = JSON.stringify(this.state.body);
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, init);
      const contentRange = response.headers.get("content-range");
      let count: number | null = null;
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        count = match ? Number(match[1]) : null;
      }

      if (!response.ok) {
        let errorBody: unknown = null;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { message: response.statusText };
        }
        const error = toError(response.status, errorBody);
        if (this.state.throwOnErrorFlag) {
          throw new Error(error.message);
        }
        return { data: null, error, count, status: response.status, statusText: response.statusText };
      }

      if (this.state.head) {
        return { data: null, error: null, count, status: response.status };
      }

      const text = await response.text();
      if (!text) {
        return { data: null, error: null, count, status: response.status };
      }

      const parsed = JSON.parse(text) as unknown;
      if (this.state.singleRow && Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return { data: null, error: null, count, status: response.status };
        }
        if (parsed.length > 1) {
          const error: PostgrestError = {
            message: "JSON object requested, multiple (or no) rows returned",
            code: "PGRST116"
          };
          return { data: null, error, count, status: response.status };
        }
        return {
          data: parsed[0] as T,
          error: null,
          count: count ?? null,
          status: response.status
        };
      }

      return {
        data: parsed as T,
        error: null,
        count: count ?? null,
        status: response.status
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const error: PostgrestError = { message, code: "FETCH_ERROR" };
      if (this.state.throwOnErrorFlag) {
        throw cause;
      }
      return { data: null, error, count: null };
    }
  }
}

export function createTableQuery(
  baseUrl: string,
  headers: Record<string, string>,
  table: string
): PostgrestQueryBuilder {
  return new PostgrestHttpBuilder(baseUrl, headers, table);
}
