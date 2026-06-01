import type { ReactNode } from "react";
import { AvatarFallback, Badge, Card } from "@/components/ui";
import { StatCard } from "@/components/profile/StatCard";
import type { ProfileBadge, ProfileStat } from "@/types/profile";

type ProfileHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  handle?: string | null;
  bio?: string | null;
  avatarName: string;
  avatarUrl?: string | null;
  badges?: ProfileBadge[];
  stats?: ProfileStat[];
  action?: ReactNode;
  className?: string;
};

export function ProfileHeader({
  action,
  avatarName,
  avatarUrl,
  badges = [],
  bio,
  className = "",
  eyebrow,
  handle,
  stats = [],
  title
}: ProfileHeaderProps) {
  return (
    <Card className={`overflow-hidden p-0 ${className}`}>
      <div className="relative px-5 pb-5 pt-6 sm:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_28%)]"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <AvatarFallback
            className="ring-2 ring-white/10 shadow-[0_18px_36px_rgba(0,0,0,0.26)]"
            name={avatarName}
            size="lg"
            src={avatarUrl}
          />
          <div className="min-w-0 flex-1">
            <p className="page-kicker">{eyebrow}</p>
            <h1 className="mt-2 text-[1.95rem] font-black leading-[1.03] tracking-normal text-white sm:text-[2.3rem]">
              {title}
            </h1>
            {handle ? (
              <p className="mt-2 text-sm font-medium text-zinc-400">{handle}</p>
            ) : null}
            {bio ? (
              <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-zinc-300">
                {bio}
              </p>
            ) : null}
            {badges.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <Badge key={badge.label} variant={badge.tone ?? "default"}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {stats.length ? (
          <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <StatCard hint={stat.hint} key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        ) : null}

        {action ? <div className="relative mt-5">{action}</div> : null}
      </div>
    </Card>
  );
}
