import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  isAdminOrFounder,
  type CurrentProfile
} from "@/lib/auth/getCurrentProfile";
import { getCurrentAuthContext } from "@/lib/auth/permissions";

export type AdminFounderGuardResult =
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

export async function requireAdminOrFounder(
  returnTo = "/admin/monetization",
  forbiddenMessage = "Chỉ admin/founder mới có quyền truy cập khu vực này."
): Promise<AdminFounderGuardResult> {
  const { error, profile, user } = await getCurrentProfile();

  if (!user && !error) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  if (error) {
    return { ok: false, profile: null, error };
  }

  const authContext = profile ? await getCurrentAuthContext() : null;
  const hasFinanceAccess =
    profile &&
    (isAdminOrFounder(profile) ||
      authContext?.permissions.includes("finance.dashboard.view"));

  if (!profile || !hasFinanceAccess) {
    return {
      ok: false,
      profile: null,
      error: forbiddenMessage
    };
  }

  return { ok: true, profile, error: null };
}
