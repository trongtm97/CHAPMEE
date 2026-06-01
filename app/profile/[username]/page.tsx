import { redirect } from "next/navigation";
import { getProfileTabUrl, getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import type { PublicProfileTab } from "@/types/public-profile";

type ProfileUsernameRedirectProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
};

const validTabs = new Set<PublicProfileTab>([
  "collections",
  "activity",
  "comments",
  "badges",
  "works"
]);

export default async function ProfileUsernameRedirect({
  params,
  searchParams
}: ProfileUsernameRedirectProps) {
  const { username } = await params;
  const query = await searchParams;
  const tab =
    query.tab && validTabs.has(query.tab as PublicProfileTab)
      ? (query.tab as PublicProfileTab)
      : "collections";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const dest =
    getProfileTabUrl(username, tab, page) ?? getProfileUrlOrFallback(username);
  redirect(dest);
}
