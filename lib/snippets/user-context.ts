import "server-only";

import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { isNextBuildPhase } from "@/lib/build/is-build-time";
import type { SnippetUserRuntimeContext } from "@/lib/snippets/types";

export type { SnippetUserRuntimeContext };

export async function getSnippetUserRuntimeContext(): Promise<SnippetUserRuntimeContext> {
  const guestContext: SnippetUserRuntimeContext = {
    isLoggedIn: false,
    isReader: false,
    isCreator: false,
    isAdmin: false
  };

  if (isNextBuildPhase()) {
    return guestContext;
  }

  let ctx = null;
  try {
    ctx = await getCurrentAuthContext();
  } catch {
    return guestContext;
  }

  if (!ctx) {
    return guestContext;
  }

  const roles = new Set(ctx.roles);
  const isAdmin =
    roles.has("admin") ||
    roles.has("super_admin") ||
    roles.has("owner") ||
    ctx.permissions.includes("admin.dashboard.view");

  return {
    isLoggedIn: true,
    isReader: roles.has("reader") || !roles.has("creator"),
    isCreator: roles.has("creator") || roles.has("verified_creator"),
    isAdmin
  };
}
