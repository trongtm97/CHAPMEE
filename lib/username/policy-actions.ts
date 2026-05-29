"use server";

import { validateDisplayName } from "@/lib/username/validate-display-name";
import { validateUsername } from "@/lib/username/validate-username";

export async function checkDisplayNamePolicyAction(
  displayName: string,
  userId?: string | null
) {
  return validateDisplayName(displayName, userId);
}

export async function checkUsernamePolicyAction(username: string, userId?: string | null) {
  return validateUsername(username, userId);
}
