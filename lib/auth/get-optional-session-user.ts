import { getSessionUser } from "@/lib/auth/get-session-user";

export type OptionalSessionUser = {
  email?: string;
  id: string;
};

/**
 * Safe user lookup for public pages.
 * Returns null on any auth/session failure so the page can keep rendering as guest.
 */
export async function getOptionalSessionUser(): Promise<OptionalSessionUser | null> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email
    };
  } catch {
    return null;
  }
}
