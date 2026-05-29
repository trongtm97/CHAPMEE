import Link from "next/link";
import { ChapMeeLogo } from "@/components/brand/ChapMeeLogo";
import { Badge } from "@/components/ui";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import {
  STUDIO_FULL_NAME,
  STUDIO_SHORT_NAME,
  STUDIO_TAGLINE,
  studioPath
} from "@/lib/studio/constants";

type StudioTopbarProps = {
  creatorProfile: CreatorProfile;
};

export function StudioTopbar({ creatorProfile }: StudioTopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/92 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col items-start justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-2">
          <Link className="inline-block" href="/">
            <ChapMeeLogo height={28} />
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
            {STUDIO_FULL_NAME}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-black tracking-normal text-white sm:text-xl">
              {STUDIO_SHORT_NAME}
            </h1>
            <Badge
              variant={
                creatorProfile.status === "active" ? "success" : "danger"
              }
            >
              {creatorProfile.status}
            </Badge>
          </div>
          <p className="text-sm text-zinc-400">{STUDIO_TAGLINE}</p>
          <p className="truncate text-sm font-medium text-zinc-300">
            {creatorProfile.pen_name}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10 sm:w-auto"
            href={studioPath("/help")}
          >
            Hỗ trợ
          </Link>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10 sm:w-auto"
            href={studioPath("/stories/new")}
          >
            Viết truyện
          </Link>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 sm:w-auto"
            href="/"
          >
            Quay lại ChapMee
          </Link>
        </div>
      </div>
    </header>
  );
}
