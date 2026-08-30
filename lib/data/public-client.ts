import { createPostgrestPublicClient } from "@/lib/db/postgrest/public-client";

/** Anonymous client for public cached reads — no session cookies required. */
export function createPublicClient() {
  return createPostgrestPublicClient();
}
