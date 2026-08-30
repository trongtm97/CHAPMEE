import type { SnippetUserRuntimeContext, SnippetUserTarget } from "@/lib/snippets/types";

export function matchesUserTarget(
  user: SnippetUserRuntimeContext,
  userTarget: SnippetUserTarget
) {
  switch (userTarget) {
    case "all":
      return true;
    case "logged_out":
      return !user.isLoggedIn;
    case "logged_in":
      return user.isLoggedIn;
    case "reader":
      return user.isLoggedIn && user.isReader && !user.isCreator;
    case "creator":
      return user.isLoggedIn && user.isCreator;
    case "admin":
      return user.isLoggedIn && user.isAdmin;
    default:
      return false;
  }
}
