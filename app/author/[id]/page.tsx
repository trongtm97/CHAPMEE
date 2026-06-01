import { notFound, permanentRedirect } from "next/navigation";
import { getCreatorProfileByUserId } from "@/lib/creator/getCreatorProfile";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AuthorLegacyRouteProps = {
  params: Promise<{ id: string }>;
};

/** Legacy `/author/:userId` → `/@username` */
export default async function AuthorLegacyRedirectPage({ params }: AuthorLegacyRouteProps) {
  const { id: userId } = await params;
  const { creatorProfile } = await getCreatorProfileByUserId(userId);

  if (!creatorProfile) {
    notFound();
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  const target = getProfileUrl(profile?.username);
  if (target) {
    permanentRedirect(target);
  }

  notFound();
}
