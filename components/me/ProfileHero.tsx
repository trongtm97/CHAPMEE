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
  isVerified?: boolean;
  editHref?: string;
  publicProfilePath?: string | null;
  shareUrl?: string;
  shareText?: string;
};

const iconButtonClass =
  "tap-highlight inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200";

function RolePill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-1.5 py-px text-[0.58rem] font-medium text-cyan-100">
      {label}
    </span>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="m14 5 5 5-9 9H5v-5l9-9Z"
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
  isVerified = false,
  publicProfilePath,
  roleBadges,
  shareText,
  shareUrl,
  stats
}: ProfileHeroProps) {
  const hasBio = Boolean(bio?.trim());
  const accentBadges = [
    ...(isCreator ? [{ key: "creator", label: "Tác giả" }] : []),
    ...(isVerified ? [{ key: "verified", label: "Đã xác minh" }] : []),
    ...roleBadges.slice(0, 2).map((badge) => ({ key: badge.label, label: badge.label }))
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div
        aria-hidden="true"
        className="h-14 bg-gradient-to-br from-cyan-500/15 via-zinc-900/40 to-zinc-950"
      />
      <div className="relative px-3 pb-3 pt-0">
        <div className="-mt-7 flex gap-3">
          <Link className="shrink-0 self-start rounded-full" href={editHref}>
            <AvatarFallback
              className="ring-2 ring-[#0b1016] ring-offset-0 shadow-lg"
              name={displayName}
              size="lg"
              src={avatarUrl}
            />
          </Link>

          <div className="min-w-0 flex-1 pt-8">
            <h1 className="line-clamp-2 text-[1.05rem] font-black leading-snug text-white">
              {displayName}
            </h1>
            {handle ? (
              <p className="mt-0.5 truncate text-[0.7rem] font-medium text-zinc-400">{handle}</p>
            ) : null}

            {accentBadges.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {accentBadges.map((badge) => (
                  <RolePill key={badge.key} label={badge.label} />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {stats.length ? (
          <div className="mt-2.5 grid grid-cols-4 gap-0.5 rounded-lg border border-white/5 bg-white/[0.02] p-1">
            {stats.map((stat) => (
              <div className="px-0.5 py-1 text-center" key={stat.label}>
                <p className="text-sm font-black text-white">{stat.value}</p>
                <p className="mt-px text-[0.55rem] font-medium text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="relative mt-2 text-center">
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

        <div className="relative mt-2.5 flex items-center gap-2">
          <Link aria-label="Sửa hồ sơ" className={iconButtonClass} href={editHref}>
            <EditIcon />
          </Link>

          {publicProfilePath ? (
            <Link
              className="inline-flex min-h-8 min-w-0 flex-1 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 text-[0.68rem] font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
              href={publicProfilePath}
            >
              Xem hồ sơ
            </Link>
          ) : (
            <Link
              className="inline-flex min-h-8 min-w-0 flex-1 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 px-3 text-[0.68rem] font-semibold text-amber-100"
              href={editHref}
            >
              Tạo username
            </Link>
          )}

          {shareUrl ? (
            <ProfileShareButton
              buttonClassName={iconButtonClass}
              iconClassName="size-3.5"
              shareText={shareText}
              shareUrl={shareUrl}
              title={displayName}
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
}
