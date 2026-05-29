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

  const rbacGuard = await requireAdminOrModeratorAccess(returnTo);
  if (!rbacGuard.ok || !profile) {
    return {
      ok: false,
      profile: null,
      error: rbacGuard.error ?? "Bạn không có quyền truy cập khu vực admin."
    };
  }

  return { ok: true, profile, error: null };
}
