"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePublicProfilePaths } from "@/lib/profile/revalidate-public-profile";
import { getProfilePrivacySettings } from "@/lib/profile/get-profile-privacy";

type FollowUserInput = {
  followingId: string;
  following: boolean;
  returnTo: string;
  username?: string | null;
};

export async function followUserAction(input: FollowUserInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(input.returnTo)}`);
  }

  if (user.id === input.followingId) {
    redirect(input.returnTo);
  }

  const privacy = await getProfilePrivacySettings(input.followingId);
  if (!privacy.allowFollow) {
    redirect(
      `${input.returnTo}${input.returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Người dùng này không nhận theo dõi.")}`
    );
  }

  if (input.following) {
    const { error: insertError } = await supabase.from("user_follows").insert({
      follower_id: user.id,
      following_id: input.followingId
    });
    if (insertError && insertError.code !== "23505") {
      redirect(
        `${input.returnTo}${input.returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Không thể theo dõi.")}`
      );
    }
  } else {
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", input.followingId);
  }

  revalidatePath(input.returnTo);
  revalidatePublicProfilePaths(input.username);

  const toast = input.following ? "followed" : "unfollowed";
  redirect(
    `${input.returnTo}${input.returnTo.includes("?") ? "&" : "?"}toast=${toast}`
  );
}
