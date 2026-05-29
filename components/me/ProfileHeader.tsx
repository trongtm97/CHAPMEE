import { Badge, Card } from "@/components/ui";
import type { CurrentUserProfile } from "@/lib/auth/getCurrentUser";

type ProfileHeaderProps = {
  email?: string;
  profile: CurrentUserProfile | null;
};

const stats = [
  { label: "Truyện đã lưu", value: "0" },
  { label: "Đang đọc", value: "0" },
  { label: "Đang theo dõi", value: "0" }
];

export function ProfileHeader({ email, profile }: ProfileHeaderProps) {
  const displayName =
    profile?.display_name ?? profile?.username ?? email ?? "ChapMee reader";
  const initials = displayName.trim().charAt(0).toUpperCase() || "C";

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300 text-2xl font-bold text-zinc-950 shadow-[0_14px_30px_rgba(103,232,249,0.18)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-normal text-white">
            {displayName}
          </h1>
          <p className="mt-1 break-words text-sm text-zinc-400">
            {profile?.username ? `@${profile.username}` : email}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{profile?.role ?? "user"}</Badge>
            <Badge variant={profile ? "success" : "warning"}>
              {profile ? "Hồ sơ sẵn sàng" : "Đang tạo hồ sơ"}
            </Badge>
          </div>
        </div>
      </div>
      {profile?.bio ? (
        <p className="text-sm leading-6 text-zinc-300">{profile.bio}</p>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center"
            key={stat.label}
          >
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-[11px] leading-4 text-zinc-500">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
