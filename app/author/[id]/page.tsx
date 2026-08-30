import { notFound, permanentRedirect } from "next/navigation";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { createClient } from "@/lib/data/server";

export const dynamic = "force-dynamic";

type AuthorLegacyRouteProps = {
  params: Promise<{ id: string }>;
};

async function resolveProfileUsername(
  db: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<string | null> {
  const { data: profileByUserId } = await db
    .from("profiles")
    .select("username")
    .eq("id", id)
    .maybeSingle();

  if (profileByUserId?.username) {
    return profileByUserId.username;
  }

  const { data: creatorByProfileId } = await db
    .from("creator_profiles")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (creatorByProfileId?.user_id) {
    const { data: profileByCreatorUserId } = await db
      .from("profiles")
      .select("username")
      .eq("id", creatorByProfileId.user_id)
      .maybeSingle();
    return profileByCreatorUserId?.username ?? null;
  }

  return null;
}

/** Legacy `/author/:id` → `/@username` (id = user id or legacy creator_profiles.id). */
export default async function AuthorLegacyRedirectPage({ params }: AuthorLegacyRouteProps) {
  const { id } = await params;
  const db = await createClient();
  const username = await resolveProfileUsername(db, id);
  const target = getProfileUrl(username);

  if (target) {
    permanentRedirect(target);
  }

  notFound();
}
