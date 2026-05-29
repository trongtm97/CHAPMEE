import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProfilePage } from "@/components/profile/PublicProfilePage";
import { getPublicProfileByUsername } from "@/lib/profile/get-public-profile";
import type { PublicProfileTab } from "@/types/public-profile";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
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

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicProfileByUsername(username);

  if (!data) {
    return {
      title: "Không tìm thấy người dùng",
      description: "Không tìm thấy người dùng."
    };
  }

  return {
    title: data.user.displayName,
    description: data.user.bio ?? `Hồ sơ công khai của ${data.user.displayName} trên ChapMee.`
  };
}

export default async function PublicProfileRoute({
  params,
  searchParams
}: ProfilePageProps) {
  const { username } = await params;
  const query = await searchParams;
  const tab = validTabs.has(query.tab as PublicProfileTab)
    ? (query.tab as PublicProfileTab)
    : "collections";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);

  const data = await getPublicProfileByUsername(username, { tab, page });

  if (!data) {
    notFound();
  }

  return <PublicProfilePage activeTab={tab} data={data} page={page} />;
}
