import Link from "next/link";
import { AvatarFallback, Card } from "@/components/ui";
import { ProfileShareButton } from "@/components/me/ProfileShareButton";
import type { ProfileBadge, ProfileStat } from "@/types/profile";

type ProfileHeroProps = {
  displayName: string;
  handle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  roleBadges: ProfileBadge[];
  stats: ProfileStat[];
  isCreator: boolean;
  editHref?: string;
  shareUrl?: string;
  shareText?: string;
};

const profileIconButtonClass =
  "tap-highlight inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-zinc-400 transition hover:border-white/12 hover:bg-white/[0.06] hover:text-zinc-200";

function RolePill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/8 bg-white/[0.03] px-1.5 py-px text-[0.58rem] font-medium text-zinc-500">
      {label}
    </span>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="m15.5 5.5 3 3L9 18H6v-3l9.5-9.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ProfileHero({
  avatarUrl,
  bio,
  displayName,
  editHref = "/me/settings",
  handle,
  isCreator,
  roleBadges,
  shareText,
  shareUrl,
  stats
}: ProfileHeroProps) {
  const hasBio = Boolean(bio?.trim());

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative px-3 pb-2.5 pt-2.5">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.07),transparent_42%)]"
        />

        <div className="relative flex gap-3">
          <Link className="shrink-0 self-start rounded-full" href={editHref}>
            <AvatarFallback
              className="ring-2 ring-cyan-300/10 shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
              name={displayName}
              size="xl"
              src={avatarUrl}
            />
          </Link>

          <div className="flex min-h-[4.75rem] min-w-0 flex-1 flex-col justify-between">
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0 flex-1 text-left">
                <h1 className="truncate text-[1.125rem] font-black leading-tight text-white">
                  {displayName}
                </h1>
                {handle ? (
                  <p className="mt-0.5 truncate text-xs font-medium text-zinc-400">{handle}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <Link aria-label="Sửa hồ sơ" className={profileIconButtonClass} href={editHref}>
                  <EditIcon />
                </Link>
                {shareUrl ? (
                  <ProfileShareButton
                    buttonClassName={profileIconButtonClass}
                    iconClassName="size-3.5"
                    shareText={shareText}
                    shareUrl={shareUrl}
                    title={displayName}
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-1 flex flex-wrap gap-1">
              <RolePill label="Độc giả" />
              {isCreator ? <RolePill label="Tác giả" /> : null}
              {roleBadges.slice(0, 2).map((badge) => (
                <RolePill key={badge.label} label={badge.label} />
              ))}
            </div>
          </div>
        </div>

        {stats.length ? (
          <div className="relative mt-2 grid grid-cols-4 gap-0.5">
            {stats.map((stat) => (
              <div className="px-0.5 py-0.5 text-center" key={stat.label}>
                <p className="text-sm font-black text-white">{stat.value}</p>
                <p className="mt-px text-[0.55rem] font-medium text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="relative mt-1.5 text-center">
          {hasBio ? (
            <p className="mx-auto line-clamp-2 max-w-md text-xs leading-5 text-zinc-400">{bio}</p>
          ) : (
            <Link
              className="text-[0.68rem] font-semibold text-cyan-200/90 hover:text-cyan-100"
              href={editHref}
            >
              Thêm bio
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
