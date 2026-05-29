import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CreatorProfilePage, { generateMetadata as generateCreatorMetadata } from "@/app/creators/[creatorId]/page";
import { getPublicCreatorIdByUsername } from "@/lib/creators/getPublicCreatorIdByUsername";
import { getPublicAuthorUsernames } from "@/lib/seo/static-params";

type AuthorUsernameRouteProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params
}: AuthorUsernameRouteProps): Promise<Metadata> {
  const { username } = await params;
  const creatorId = await getPublicCreatorIdByUsername(username);
  if (!creatorId) {
    return {
      title: "Tác giả không tồn tại",
      description: "Không tìm thấy hồ sơ tác giả.",
      robots: { index: false, follow: false }
    };
  }

  return generateCreatorMetadata({ params: Promise.resolve({ creatorId }) });
}

export async function generateStaticParams() {
  const usernames = await getPublicAuthorUsernames();
  return usernames.map((username) => ({ username }));
}

export default async function AuthorUsernameRoute({ params }: AuthorUsernameRouteProps) {
  const { username } = await params;
  const creatorId = await getPublicCreatorIdByUsername(username);
  if (!creatorId) {
    notFound();
  }

  return <CreatorProfilePage params={Promise.resolve({ creatorId })} />;
}
