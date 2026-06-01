import {
  generateUsernameFromDisplayName,
  normalizeUsername
} from "@/lib/username/normalize-username";
import { suggestDefaultUsername } from "@/lib/username/suggest-default-username";

/**
 * Allocate a unique username from display name (banhcuonnho, banhcuonnho1, …).
 */
export async function allocateUsernameFromDisplayName(
  displayName: string,
  excludeUserId?: string | null
): Promise<string | null> {
  return suggestDefaultUsername(displayName, excludeUserId);
}

export { normalizeUsername, suggestDefaultUsername };
