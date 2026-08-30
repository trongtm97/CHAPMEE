import { createHmac } from "node:crypto";

type PostgrestJwtPayload = {
  sub: string;
  role?: string;
  exp?: number;
};

function base64UrlEncode(input: string | Buffer) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function getJwtSecret() {
  const secret =
    process.env.POSTGREST_JWT_SECRET?.trim() ||
    process.env.PGRST_JWT_SECRET?.trim() ||
    "";
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[auth] POSTGREST_JWT_SECRET is not set — PostgREST RLS requests will fail. Add it to .env.local (must match PGRST_JWT_SECRET in Docker)."
    );
  }
  return null;
}

/** HS256 JWT for PostgREST (`sub` → auth.uid(), `role` → DB role). */
export function signPostgrestJwt(
  payload: PostgrestJwtPayload,
  ttlSeconds = 60 * 60
): string | null {
  const secret = getJwtSecret();
  if (!secret || !payload.sub) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const body: PostgrestJwtPayload = {
    role: "authenticated",
    ...payload,
    exp: payload.exp ?? now + ttlSeconds
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = createHmac("sha256", secret)
    .update(`${header}.${encodedBody}`)
    .digest("base64url");

  return `${header}.${encodedBody}.${signature}`;
}

export function getPostgrestServiceRoleHeader(): string | null {
  const role =
    process.env.POSTGREST_SERVICE_ROLE ?? process.env.PGREST_SERVICE_ROLE ?? null;
  if (role) {
    return `Bearer ${role}`;
  }

  const secret = getJwtSecret();
  if (!secret) {
    return null;
  }

  const token = signPostgrestJwt({ sub: "service", role: "service_role" });
  return token ? `Bearer ${token}` : null;
}
