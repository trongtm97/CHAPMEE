import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReportButton } from "@/components/report/ReportButton";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { PublicProfilePage } from "@/components/profile/PublicProfilePage";
import { ShareButton } from "@/components/share/ShareButton";
import { EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getPublicProfileByUsername } from "@/lib/profile/get-public-profile";
import {
  getProfileTabUrl,
  getProfileUrl,
  getPublicProfileSharePath
} from "@/lib/profile/profile-url";
import { buildProfileHandle } from "@/lib/profile/buildProfileHandle";
import { getReaderProfile } from "@/lib/profile/getReaderProfile";
import { buildReaderStats } from "@/lib/profile/profileIdentity";
import { buildReaderProfileSharePayload } from "@/lib/share/profileShare";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { createClient } from "@/lib/data/server";
import { resolveProfileAvatarUrl } from "@/lib/profile/resolve-profile-avatar";
export const dynamic = "force-dynamic";

type MeHandlePageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export async function generateMetadata({ params }: MeHandlePageProps): Promise<Metadata> {
  const { handle } = await params;
  const data = await getPublicProfileByUsername(handle);

  if (data) {
    return {
      title: data.user.displayName,
      description: data.user.bio ?? `Hồ sơ công khai của ${data.user.displayName} trên ChapMee.`
    };
  }

  if (!isUuid(handle)) {
    return {
      title: "Không tìm thấy người dùng",
      description: "Không tìm thấy người dùng."
    };
  }

  const db = await createClient();
  const { data: profile } = await db
    .from("profiles")
    .select("display_name, username, bio, avatar_url")
    .eq("id", handle)
    .maybeSingle();

  if (!profile) {
    return { title: "Không tìm thấy hồ sơ", description: "Không tìm thấy hồ sơ người dùng." };
  }

  return {
    title: profile.display_name ?? profile.username ?? "Độc giả ChapMee",
    description: profile.bio ?? "Hồ sơ độc giả trên ChapMee."
  };
}

async function LegacyMeProfilePage({ userId }: { userId: string }) {
  const db = await createClient();
  const { data } = await db
    .from("profiles")
    .select("id, display_name, username, bio, avatar_url, default_avatar_id, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!data) notFound();

  const { profile: currentProfile } = await getCurrentUser();
  const readerProfile = await getReaderProfile(
    currentProfile ?? {
      id: userId,
      username: data.username,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      bio: data.bio,
      role: "user",
      created_at: data.created_at
    }
  );
  const displayName = data.display_name ?? data.username ?? "Độc giả ChapMee";
  const avatarUrl = resolveProfileAvatarUrl(data);
  const profileHandle = buildProfileHandle({
    username: data.username,
    displayName: data.display_name,
    userId: data.id
  });
  const stats = buildReaderStats({
    commentCount: readerProfile.metrics.commentCount,
    currentReadingCount: 0,
    followingAuthorsCount: readerProfile.metrics.followingAuthorsCount,
    savedStoriesCount: readerProfile.metrics.savedStoriesCount
  });
  const publicSharePath = getPublicProfileSharePath(data.username);
  const shareUrl = publicSharePath ? getShareUrl(publicSharePath) : null;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="page-kicker">Public profile</p>
        <h1 className="page-title">Hồ sơ đọc giả</h1>
      </section>
      <ProfileHeader
        action={
          shareUrl ? (
            <ShareButton
              label="Chia sẻ profile"
              payload={buildReaderProfileSharePayload({
                avatarUrl,
                bio: data.bio,
                stats,
                title: displayName,
                url: shareUrl
              })}
            />
          ) : undefined
        }
        avatarName={displayName}
        avatarUrl={avatarUrl}
        bio={data.bio}
        eyebrow="Reader Profile"
        handle={profileHandle}
        stats={stats}
        title={displayName}
      />
      {currentProfile?.id === userId ? (
        <EmptyState
          description="Đây là profile công khai của bạn. Hãy share để khoe gu đọc."
          title="Đây là profile của bạn"
        />
      ) : (
        <ReportButton
          returnTo={publicSharePath ?? `/me/${userId}`}
          targetId={userId}
          targetType="user"
        />
      )}
    </div>
  );
}

export default async function MeHandlePage({ params, searchParams }: MeHandlePageProps) {
  const { handle } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);

  const data = await getPublicProfileByUsername(handle, {
    tab: query.tab,
    page
  });
  if (data) {
    const dest =
      getProfileTabUrl(data.user.username, query.tab ?? "stories", page) ??
      getProfileUrl(data.user.username);
    if (dest) {
      redirect(dest);
    }
  }

  if (isUuid(handle)) {
    const db = await createClient();
    const { data: profile } = await db
      .from("profiles")
      .select("username")
      .eq("id", handle)
      .maybeSingle();

    if (profile?.username) {
      const qs = new URLSearchParams();
      if (query.tab) qs.set("tab", query.tab);
      if (query.page) qs.set("page", query.page);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const dest =
        getProfileTabUrl(
          profile.username,
          query.tab ?? "stories",
          Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1)
        ) ?? `/@${profile.username}`;
      redirect(dest);
    }

    return <LegacyMeProfilePage userId={handle} />;
  }

  notFound();
}
