import Link from "next/link";
import { AvatarFallback, Badge } from "@/components/ui";
import { StartMessageButton } from "@/components/messages/StartMessageButton";
import { ProfileFollowButton } from "@/components/profile/ProfileFollowButton";
import { ProfileShareButton } from "@/components/profile/ProfileShareButton";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { VerifiedName } from "@/components/profile/VerifiedBadge";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { getPublicProfileSharePath } from "@/lib/profile/profile-url";
import { getShareUrl } from "@/lib/share/getShareUrl";
import type { PublicProfilePageData } from "@/types/public-profile";

const actionButtonClass =
  "tap-highlight inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition sm:max-w-[10rem] sm:flex-none sm:px-4";

type PublicProfileHeroProps = {
  data: PublicProfilePageData;
};

export function PublicProfileHero({ data }: PublicProfileHeroProps) {
  const publicSharePath = getPublicProfileSharePath(data.user.username);
  const shareUrl = publicSharePath ? getShareUrl(publicSharePath) : "";
  const bio = data.user.bio?.trim() ?? "";
  const featured = data.creator?.featuredWork;
  const chipBadges = data.user.isCreator
    ? data.badges.filter((badge) => badge.label.trim().toLowerCase() !== "tác giả")
    : data.badges;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1016] shadow-sm">
      <div
        aria-hidden="true"
        className="relative h-28 w-full sm:h-36"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/90 via-[#101c28] to-[#0b1016]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(103,232,249,0.28),transparent_46%),radial-gradient(circle_at_82%_8%,rgba(56,189,248,0.12),transparent_34%)]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b1016] via-[#0b1016]/80 to-transparent" />
      </div>

      <div className="relative px-4 pb-4 sm:px-5 sm:pb-5">
        <div className={featured ? "lg:grid lg:grid-cols-[1fr_220px] lg:items-start lg:gap-5" : ""}>
          <div className="min-w-0">
            <div className="-mt-11 flex items-end gap-3 sm:-mt-12">
              <AvatarFallback
                className="shrink-0 shadow-xl ring-4 ring-[#0b1016]"
                name={data.user.displayName}
                size="xl"
                src={data.user.avatarUrl}
              />
              <div className="min-w-0 flex-1 pb-0.5">
                <h1 className="break-words text-xl font-black leading-tight text-white sm:text-2xl">
                  <VerifiedName
                    badge={data.user.verification}
                    name={data.user.displayName}
                    nameClassName="break-words"
                  />
                </h1>
                <p className="mt-0.5 truncate text-sm text-zinc-400">@{data.user.username}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.user.isCreator ? (
                    <Badge variant="warning">Tác giả</Badge>
                  ) : null}
                  {chipBadges.slice(0, data.user.isCreator ? 3 : 4).map((badge) => (
                    <Badge key={badge.label} variant={badge.tone ?? "default"}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <p
              className={`mt-3 text-sm leading-relaxed ${
                bio ? "line-clamp-3 text-zinc-300" : "text-zinc-500"
              }`}
            >
              {bio || "Người dùng này chưa thêm giới thiệu."}
            </p>

            <div className="mt-4">
              <ProfileStats stats={data.stats} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="min-w-[7.5rem] flex-1 sm:flex-none">
                <ProfileFollowButton
                  actionClassName={actionButtonClass}
                  data={data}
                  returnTo={shareUrl || publicSharePath || "/"}
                />
              </div>
              {!data.viewer.isOwner ? (
                <StartMessageButton
                  buttonClassName={`${actionButtonClass} border border-white/12 bg-white/[0.04] text-zinc-100 hover:border-white/20`}
                  canMessage={data.messaging.canMessage}
                  canShowButton={data.messaging.canShowButton}
                  loginRequired={data.messaging.loginRequired}
                  mode={data.messaging.mode}
                  reason={data.messaging.reason}
                  recipientId={data.user.id}
                  returnTo={shareUrl || publicSharePath || `/@${data.user.username}`}
                />
              ) : null}
              {shareUrl ? (
                <ProfileShareButton
                  buttonClassName={`${actionButtonClass} border border-white/12 bg-white/[0.04] text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]`}
                  label="Chia sẻ"
                  shareText={data.user.bio ?? data.user.displayName}
                  shareUrl={shareUrl}
                  title={data.user.displayName}
                />
              ) : null}
            </div>
          </div>

          {featured ? (
            <aside className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-3 lg:mt-0 lg:self-start">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cyan-200">
                Truyện nổi bật
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-bold text-white">{featured.title}</p>
              {featured.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{featured.description}</p>
              ) : null}
              <Link
                className="mt-2 inline-block text-xs font-semibold text-cyan-100 underline-offset-2 hover:underline"
                href={getStoryDetailHref({
                  slug: featured.slug,
                  public_code: featured.publicCode
                })}
              >
                Đọc ngay
              </Link>
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
