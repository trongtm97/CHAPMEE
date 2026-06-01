import { revalidatePath } from "next/cache";
import { getProfileUrl } from "@/lib/profile/profile-url";

/** Invalidate public profile routes after profile/creator settings change. */
export function revalidatePublicProfilePaths(
  username: string | null | undefined,
  options?: { userId?: string | null }
) {
  const normalized = username?.trim().toLowerCase();
  if (normalized) {
    revalidatePath(`/me/${normalized}`);
    revalidatePath(`/u/${normalized}`);
    const atPath = getProfileUrl(normalized);
    if (atPath) {
      revalidatePath(atPath);
    }
  }
  if (options?.userId) {
    revalidatePath(`/me/${options.userId}`);
  }
}
