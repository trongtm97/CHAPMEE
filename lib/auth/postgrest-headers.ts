import { headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { signPostgrestJwt } from "@/lib/auth/postgrest-jwt";
import { getPostgrestServiceRoleHeader } from "@/lib/auth/postgrest-jwt";

/** Authorization headers for PostgREST (session JWT or service role). */
export async function getPostgrestRequestHeaders(
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };

  try {
    const headerStore = await nextHeaders();
    const session = await auth.api.getSession({ headers: headerStore });
    const userId = session?.user?.id;
    if (userId) {
      const token = signPostgrestJwt({ sub: userId, role: "authenticated" });
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        return headers;
      }
    }
  } catch {
    // Fall through to service-role / anonymous headers below.
  }

  const service = getPostgrestServiceRoleHeader();
  if (service) {
    headers.Authorization = service;
    return headers;
  }

  return headers;
}

export function getPostgrestAdminHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };

  const service = getPostgrestServiceRoleHeader();
  if (service) {
    headers.Authorization = service;
    return headers;
  }

  return headers;
}
