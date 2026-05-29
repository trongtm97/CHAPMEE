import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportButton } from "@/components/report/ReportButton";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ShareButton } from "@/components/share/ShareButton";
import { EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getReaderProfile } from "@/lib/profile/getReaderProfile";
import { buildReaderStats } from "@/lib/profile/profileIdentity";
import { buildReaderProfileSharePayload } from "@/lib/share/profileShare";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { buildProfileHandle } from "@/lib/profile/buildProfileHandle";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MeProfilePageProps = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: MeProfilePageProps): Promise<Metadata> {
  const { userId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, username, bio, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    return { title: "Không tìm thấy hồ sơ", description: "Không tìm thấy hồ sơ người dùng." };
  }

  return {
    title: data.display_name ?? data.username ?? "Độc giả ChapMee",
    description: data.bio ?? `Hồ sơ độc giả trên ChapMee.`
  };
}

export default async function MeProfilePage({ params }: MeProfilePageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, bio, avatar_url, created_at")
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
  const handle = buildProfileHandle({
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

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="page-kicker">Public profile</p>
        <h1 className="page-title">Hồ sơ đọc giả</h1>
      </section>
      <ProfileHeader
        action={
          <ShareButton
            label="Chia sẻ profile"
            payload={buildReaderProfileSharePayload({
              avatarUrl: data.avatar_url,
              bio: data.bio,
              stats,
              title: displayName,
              url: getShareUrl(`/me/${userId}`)
            })}
          />
        }
        avatarName={displayName}
        avatarUrl={data.avatar_url}
        bio={data.bio}
        eyebrow="Reader Profile"
        handle={handle}
        stats={stats}
        title={displayName}
      />
      {currentProfile?.id === userId ? (
        <EmptyState description="Đây là profile công khai của bạn. Hãy share để khoe gu đọc." title="Đây là profile của bạn" />
      ) : (
        <ReportButton
          returnTo={`/me/${userId}`}
          targetId={userId}
          targetType="user"
        />
      )}
    </div>
  );
}
