import { redirect } from "next/navigation";
import { getProfileCollectionUrl, getProfileUrlOrFallback } from "@/lib/profile/profile-url";

type ProfileCollectionRedirectProps = {
  params: Promise<{ username: string; collectionId: string }>;
};

export default async function ProfileCollectionRedirect({ params }: ProfileCollectionRedirectProps) {
  const { username, collectionId } = await params;
  const dest =
    getProfileCollectionUrl(username, collectionId) ??
    getProfileUrlOrFallback(username);
  redirect(dest);
}
