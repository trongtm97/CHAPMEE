import { cookies } from "next/headers";
import { getPostgrestRequestHeaders } from "@/lib/auth/postgrest-headers";
import { createDatabaseClient } from "@/lib/db/postgrest/create-client";

export async function createClient() {
  await cookies();
  const headers = await getPostgrestRequestHeaders();
  return createDatabaseClient({ headers });
}
