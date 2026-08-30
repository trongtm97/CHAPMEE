import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublicCreatorProfile } from "@/lib/creators/getPublicCreatorProfile";
import { getProfileUrl } from "@/lib/profile/profile-url";
import {
  buildAuthorDescription,
  buildCanonicalUrl,
  getDefaultOgImage
} from "@/lib/seo/metadata";

type CreatorProfilePageProps = {
  params: Promise<{
    creatorId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: CreatorProfilePageProps): Promise<Metadata> {
  const { creatorId } = await params;
  const result = await getPublicCreatorProfile(creatorId);

  if (!result.creator?.handle) {
    return {
      title: "Không tìm thấy hồ sơ",
      robots: { index: false, follow: false }
    };
  }

  const profilePath = getProfileUrl(result.creator.handle);
  const description = buildAuthorDescription({
    displayName: result.creator.displayName,
    bio: result.creator.bio
  });
  const canonical = profilePath ? buildCanonicalUrl(profilePath) : undefined;
  const title = `${result.creator.displayName} (@${result.creator.handle}) | ChapMee`;
  const imageUrl = getDefaultOgImage();

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: "profile",
      ...(canonical ? { url: canonical } : {}),
      images: [{ url: imageUrl, alt: title }]
    }
  };
}

/** Legacy `/creators/:id` → `/@username` */
export default async function CreatorProfilePage({ params }: CreatorProfilePageProps) {
  const { creatorId } = await params;
  const result = await getPublicCreatorProfile(creatorId);

  const profilePath = getProfileUrl(result.creator?.handle);
  if (profilePath) {
    permanentRedirect(profilePath);
  }

  notFound();
}
