import Link from "next/link";
import { Card } from "@/components/ui";

type CreatorProfilePreviewProps = {
  avatarUrl: string | null;
  bio: string | null;
  creatorId: string;
  penName: string;
};

export function CreatorProfilePreview({
  avatarUrl,
  bio,
  creatorId,
  penName
}: CreatorProfilePreviewProps) {
  return (
    <Card className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
          Xem trước hồ sơ công khai
        </p>
        <div className="flex items-start gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={penName}
              className="size-16 shrink-0 rounded-full border border-white/10 object-cover"
              src={avatarUrl}
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-2xl font-bold text-cyan-300">
              {penName.slice(0, 1).toUpperCase() || "C"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">
              Tác giả
            </p>
            <h2 className="mt-1 break-words text-2xl font-bold tracking-normal text-white">
              {penName}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Đây là cách trang hồ sơ công khai của bạn sẽ hiển thị với độc giả.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {bio ? (
          <p className="text-sm leading-7 text-zinc-300">{bio}</p>
        ) : (
          <p className="text-sm leading-7 text-zinc-500">
            Chưa có bio creator.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
          href={`/creators/${creatorId}`}
        >
          Open public profile
        </Link>
        <div className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-400">
          Avatar is synced from your public account profile.
        </div>
      </div>
    </Card>
  );
}
