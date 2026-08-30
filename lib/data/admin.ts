import { getPostgrestAdminHeaders } from "@/lib/auth/postgrest-headers";
import { createDataClientAdminAuth } from "@/lib/auth/data-client-admin-compat";
import { createDatabaseClient } from "@/lib/db/postgrest/create-client";
import type { DatabaseClient } from "@/lib/db/types";

export function createAdminClient(): DatabaseClient {
  const client = createDatabaseClient({
    headers: getPostgrestAdminHeaders({
      "X-ChapMee-Admin": "1"
    })
  });

  const adminAuth = createDataClientAdminAuth();
  return {
    ...client,
    auth: {
      ...client.auth,
      admin: adminAuth
    }
  };
}
