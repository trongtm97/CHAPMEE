import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CreatorPublicProfileView } from "@/components/creators/CreatorPublicProfileView";
import { ErrorState } from "@/components/ui";
import { getPublicCreatorProfile } from "@/lib/creators/getPublicCreatorProfile";
import { getCreatorPublicPath } from "@/lib/profile/creator-public-path";
import {
  buildCanonicalUrl,
  buildAuthorDescription,
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

  if (!result.creator) {
    return {
      title: "Hồ sơ tác giả",
      description: "Hồ sơ tác giả trên ChapMee.",
      robots: { index: false, follow: false }
    };
  }

  const description = buildAuthorDescription({
    displayName: result.creator.displayName,
    bio: result.creator.bio
  });
  const publicPath = getCreatorPublicPath({
    username: result.creator.handle,
    creatorProfileId: result.creator.id
  });
  const canonical = buildCanonicalUrl(publicPath);
  const title = `Tác giả ${result.creator.displayName} trên ChapMee`;
  const imageUrl = getDefaultOgImage();

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(canonical ? { url: canonical } : {}),
      images: [
        {
          url: imageUrl,
          alt: title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default async function CreatorProfilePage({ params }: CreatorProfilePageProps) {
  const { creatorId } = await params;
  const result = await getPublicCreatorProfile(creatorId);

  if (result.creator?.handle) {
    permanentRedirect(getCreatorPublicPath({ username: result.creator.handle }));
  }

  if (result.notFound || !result.creator?.handle) {
    notFound();
  }

  if (result.error || !result.creator) {
    return (
      <section className="mx-auto max-w-[36rem] space-y-6">
        <div className="px-1">
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Tác giả
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">Hồ sơ tác giả</h1>
        </div>
        <ErrorState message={result.error} title="Không tải được hồ sơ tác giả" />
      </section>
    );
  }

  return <CreatorPublicProfileView creator={result.creator} />;
}
