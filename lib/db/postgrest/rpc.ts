import type { PostgrestError, PostgrestResponse } from "@/lib/db/types";
import { CONTENT_TYPE_JSON_UTF8 } from "@/lib/http/content-types";

function getDefaultPostgrestUrl() {
  return (
    process.env.POSTGREST_URL ??
    process.env.CHAPMEE_POSTGREST_URL ??
    "http://127.0.0.1:54321"
  );
}

function toRpcError(status: number, body: unknown): PostgrestError {
  if (body && typeof body === "object" && "message" in body) {
    const record = body as PostgrestError;
    return {
      message: record.message ?? `HTTP ${status}`,
      details: record.details,
      hint: record.hint,
      code: record.code ?? String(status)
    };
  }

  if (typeof body === "string" && body.trim()) {
    return { message: body, code: String(status) };
  }

  return { message: `HTTP ${status}`, code: String(status) };
}

/** Calls PostgREST /rpc/* so JWT claims populate auth.uid() inside SQL functions. */
export async function callRpc(
  fn: string,
  params: Record<string, unknown> = {},
  options?: { baseUrl?: string; headers?: Record<string, string> }
): Promise<PostgrestResponse<unknown>> {
  const baseUrl = options?.baseUrl ?? getDefaultPostgrestUrl();
  const headers: Record<string, string> = {
    "Content-Type": CONTENT_TYPE_JSON_UTF8,
    Accept: CONTENT_TYPE_JSON_UTF8,
    ...options?.headers
  };

  const url = `${baseUrl.replace(/\/$/, "")}/rpc/${encodeURIComponent(fn)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(params)
    });

    const text = await response.text();

    if (!response.ok) {
      let errorBody: unknown = null;
      try {
        errorBody = text ? JSON.parse(text) : null;
      } catch {
        errorBody = text;
      }
      return {
        data: null,
        error: toRpcError(response.status, errorBody),
        count: null
      };
    }

    if (!text) {
      return { data: null, error: null, count: null };
    }

    return {
      data: JSON.parse(text) as unknown,
      error: null,
      count: null
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return {
      data: null,
      error: { message, code: "FETCH_ERROR" },
      count: null
    };
  }
}
