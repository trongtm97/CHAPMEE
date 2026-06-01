import type { Metadata } from "next";
import Link from "next/link";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import { notFound, redirect } from "next/navigation";
import { AvatarFallback, Badge, Button, Card, EmptyState } from "@/components/ui";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { UserFollowButton } from "@/components/profile/UserFollowButton";
import { getPublicCollectionForProfile } from "@/lib/profile/get-public-collections";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getProfilePrivacySettings } from "@/lib/profile/get-profile-privacy";
import {
  getProfileCollectionUrl,
  getProfileUrlOrFallback
} from "@/lib/profile/profile-url";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CollectionPageProps = {
  params: Promise<{ handle: string; collectionId: string }>;
};

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { handle, collectionId } = await params;
  const result = await getPublicCollectionForProfile(collectionId, handle);
  if (!result) {
    return { title: "Không tìm thấy tủ truyện" };
  }
  return {
    title: `${result.collection.title} · ${result.owner.displayName}`,
    description: result.collection.description ?? `Tủ truyện công khai của ${result.owner.displayName}.`
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfileCollectionPage({ params }: CollectionPageProps) {
  const { handle, collectionId } = await params;

  if (!UUID_PATTERN.test(handle)) {
    const canonical = getProfileCollectionUrl(handle, collectionId);
    if (canonical) {
      redirect(canonical);
    }
  }

  const result = await getPublicCollectionForProfile(collectionId, handle);

  if (!result) {
    notFound();
  }

  const { profile: currentProfile } = await getCurrentUser();
  const privacy = await getProfilePrivacySettings(result.owner.id);
  const supabase = await createClient();

  let isFollowing = false;
  if (currentProfile?.id && currentProfile.id !== result.owner.id) {
    const { data } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", currentProfile.id)
      .eq("following_id", result.owner.id)
      .maybeSingle();
    isFollowing = Boolean(data);
  }

  const profilePath = getProfileUrlOrFallback(handle);
  const collectionPath =
    getProfileCollectionUrl(handle, collectionId) ?? `${profilePath}/collections/${collectionId}`;
  const returnTo = getShareUrl(collectionPath);
  const isOwner = currentProfile?.id === result.owner.id;

  return (
    <div className="space-y-6 pb-8">
      <MobileBackHeader fallbackHref={profilePath} title={result.collection.title} variant="compact" />

      <section className="space-y-2">
        <Badge variant="success">Tủ công khai</Badge>
        <h1 className="page-title break-words">{result.collection.title}</h1>
        {result.collection.description ? (
          <p className="page-copy">{result.collection.description}</p>
        ) : null}
        <p className="text-sm text-zinc-400">{result.collection.itemCount} truyện</p>
      </section>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Link href={profilePath}>
            <AvatarFallback
              name={result.owner.displayName}
              size="md"
              src={result.owner.avatarUrl}
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link className="text-sm font-bold text-white" href={profilePath}>
              {result.owner.displayName}
            </Link>
            <p className="text-xs text-zinc-500">@{handle}</p>
          </div>
        </div>
        {!isOwner ? (
          <UserFollowButton
            allowFollow={privacy.allowFollow}
            followingId={result.owner.id}
            isFollowing={isFollowing}
            isLoggedIn={Boolean(currentProfile)}
            isOwner={false}
            returnTo={returnTo}
            username={handle}
          />
        ) : null}
      </Card>

      {result.collection.items.length === 0 ? (
        <EmptyState description="Chủ tủ chưa thêm truyện nào." title="Tủ trống" />
      ) : (
        <div className="space-y-3">
          {result.collection.items.map((item) => (
            <Card className="p-3" key={item.id}>
              <div className="flex gap-3">
                <StoryImageThumb
                  className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-white/8 bg-white/5"
                  story={item}
                  usage="searchResult"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm font-bold text-white">{item.title}</h3>
                  <p className="truncate text-xs text-zinc-400">
                    {item.authorName ?? "Tác giả ChapMee"}
                    {item.genreName ? ` · ${item.genreName}` : ""}
                  </p>
                  <Link className="mt-2 inline-block" href={`/stories/${item.slug}`}>
                    <Button className="min-h-8 px-3 text-xs" type="button" variant="primary">
                      Đọc ngay
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
