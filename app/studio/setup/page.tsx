import { redirect } from "next/navigation";
import { ensureCreatorProfile } from "@/lib/creator/ensure-creator-profile";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";

export const dynamic = "force-dynamic";

/** Legacy /studio/setup — auto-enable creator and go straight to Studio. */
export default async function StudioSetupPage() {
  const { user, error } = await getCurrentCreatorProfile();

  if (!user && !error) {
    redirect("/login?next=/studio");
  }

  if (user) {
    await ensureCreatorProfile(user.id);
  }

  redirect("/studio");
}
