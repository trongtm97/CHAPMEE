import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { createClient } from "@/lib/data/server";

export type SessionUser = {
  email: string;
  name?: string;
  id: string;
  token: string;
};

function getSessionTokenFromCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const candidates = [
    "better-auth.session_token",
    "better-auth-session_token",
    "__Secure-better-auth.session_token",
    "__Secure-better-auth-session_token"
  ];

  for (const name of candidates) {
    const value = cookieStore.get(name)?.value;
    if (value) {
      return value;
    }
  }

  return null;
}

function getSessionTokenFromHeaders(headerStore: Awaited<ReturnType<typeof headers>>) {
  const authorization = headerStore.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

async function getBetterAuthSessionUser(): Promise<SessionUser | null> {
  const headerStore = await headers();
  const session = await auth.api.getSession({ headers: headerStore });

  if (!session?.user || !session.session) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? undefined,
    token: session.session.token
  };
}

async function getSessionUserByToken(sessionToken: string): Promise<SessionUser | null> {
  const db = await createClient();
  const { data: sessionRow, error: sessionError } = await db
    .from("session")
    .select("userId, expiresAt")
    .eq("token", sessionToken)
    .maybeSingle();

  if (sessionError || !sessionRow) {
    return null;
  }

  if (sessionRow.expiresAt && new Date(sessionRow.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const userId = String(sessionRow.userId ?? "").trim();
  if (!userId) {
    return null;
  }

  const { data: userRow, error: userError } = await db
    .from("user")
    .select("id, email, name")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !userRow) {
    return null;
  }

  return {
    id: String(userRow.id),
    email: typeof userRow.email === "string" ? userRow.email : "",
    name: typeof userRow.name === "string" ? userRow.name : undefined,
    token: sessionToken
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const user = await getBetterAuthSessionUser();
    if (user) {
      return user;
    }
  } catch {
    // Fall back to legacy cookie lookup below for older sessions/environments.
  }

  try {
    const headerStore = await headers();
    const bearerToken = getSessionTokenFromHeaders(headerStore);
    if (bearerToken) {
      const bearerUser = await getSessionUserByToken(bearerToken);
      if (bearerUser) {
        return bearerUser;
      }
    }

    const cookieStore = await cookies();
    const sessionToken = getSessionTokenFromCookies(cookieStore);

    if (!sessionToken) {
      return null;
    }

    return getSessionUserByToken(sessionToken);
  } catch {
    return null;
  }
}
