"use client";

import Link from "next/link";
import { buildProfileHandle } from "@/lib/profile/buildProfileHandle";
import type { StudioSettingsFormValues } from "@/types/studio-settings";
import type { UserVerificationSummary } from "@/types/verification";

type PublicProfilePreviewProps = {
  values: StudioSettingsFormValues;
  userId: string;
  profilePath: string;
  verification: UserVerificationSummary;
  publicStoriesCount: number;
  followerCount: number;
};

export function PublicProfilePreview({
  followerCount,
  profilePath,
  publicStoriesCount,
  userId,
  values,
  verification
}: PublicProfilePreviewProps) {
  const displayName = values.displayName.trim() || "Tác giả";
  const handle = buildProfileHandle({
    displayName,
    userId,
    username: values.username.trim() || null
  });
  const avatar = values.avatarUrl.trim() || null;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Người đọc sẽ thấy</p>

      <div className="flex items-start gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={displayName} className="size-14 rounded-full border border-white/10 object-cover" src={avatar} />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-xl font-bold text-cyan-300">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-white">{displayName}</p>
          <p className="text-sm text-zinc-500">{handle}</p>
          {verification.publicBadge ? (
            <span className="mt-1 inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">
              {verification.publicBadge.label}
            </span>
          ) : null}
        </div>
      </div>

      <p className="text-sm leading-6 text-zinc-300">
        {values.bio.trim() || "Chưa có giới thiệu — thêm vài dòng để độc giả nhớ bạn."}
      </p>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-2">
          <p className="font-semibold text-white">{publicStoriesCount}</p>
          <p className="text-zinc-500">Truyện</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-2">
          <p className="font-semibold text-white">—</p>
          <p className="text-zinc-500">Lượt đọc</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-2">
          <p className="font-semibold text-white">{followerCount}</p>
          <p className="text-zinc-500">Theo dõi</p>
        </div>
      </div>

      <Link
        className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-sm font-semibold text-zinc-100 hover:border-cyan-300/40"
        href={profilePath}
      >
        Xem hồ sơ trong ChapMee
      </Link>
    </div>
  );
}
