import { redirect } from "next/navigation";
import { getProfileTabUrl, getProfileUrlOrFallback } from "@/lib/profile/profile-url";

type ProfileUsernameRedirectProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export default async function ProfileUsernameRedirect({
  params,
  searchParams
}: ProfileUsernameRedirectProps) {
  const { username } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const dest =
    getProfileTabUrl(username, query.tab ?? "stories", page) ??
    getProfileUrlOrFallback(username);
  redirect(dest);
}
