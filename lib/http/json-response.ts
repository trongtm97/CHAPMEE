import { NextResponse } from "next/server";
import { CONTENT_TYPE_JSON_UTF8 } from "@/lib/http/content-types";

/** JSON API response with explicit UTF-8 charset. */
export function jsonUtf8Response(
  body: unknown,
  init?: ResponseInit
): NextResponse {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", CONTENT_TYPE_JSON_UTF8);
  }
  return NextResponse.json(body, { ...init, headers });
}
