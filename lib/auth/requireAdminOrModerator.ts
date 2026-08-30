import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  type CurrentProfile
} from "@/lib/auth/getCurrentProfile";
import { requireAdminOrModeratorAccess } from "@/lib/auth/require-permission";

export type AdminGuardResult =
  | {
      ok: true;
      profile: CurrentProfile;
      error: null;
    }
  | {
      ok: false;
      profile: null;
      error: string;
    };

function buildFallbackAdminProfile(userId: string): CurrentProfile {
  return {
    id: userId,
    username: null,
    display_name: null,
    avatar_url: null,
    bio: null,
    role: "founder"
  };
}

export async function requireAdminOrModerator(
  returnTo = "/admin"
): Promise<AdminGuardResult> {
  const { error, profile, user } = await getCurrentProfile();

  if (!user && !error) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  if (error) {
    return { ok: false, profile: null, error };
  }

  if (
    profile &&
    (profile.role === "admin" ||
      profile.role === "moderator" ||
      profile.role === "founder")
  ) {
    return { ok: true, profile, error: null };
  }

  const rbacGuard = await requireAdminOrModeratorAccess(returnTo);
  if (!rbacGuard.ok) {
    return {
      ok: false,
      profile: null,
      error: rbacGuard.error ?? "Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p khu vá»±c admin."
    };
  }

  if (!user) {
    return {
      ok: false,
      profile: null,
      error: "Báº¡n cáº§n Ä‘Äƒng nháº­p."
    };
  }

  return {
    ok: true,
    profile: profile ?? buildFallbackAdminProfile(user.id),
    error: null
  };
}
