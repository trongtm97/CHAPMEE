import Link from "next/link";
import { StudioBrandMark } from "@/components/studio/dashboard/shared/StudioBrandMark";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { STUDIO_SHELL_MAX_WIDTH_CLASS } from "@/lib/studio/constants";

type StudioTopbarProps = {
  creatorProfile: CreatorProfile;
};

export function StudioTopbar({ creatorProfile }: StudioTopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/92 backdrop-blur-xl lg:hidden">
      <div
        className={`mx-auto flex w-full ${STUDIO_SHELL_MAX_WIDTH_CLASS} items-center justify-between gap-2 px-3 py-2`}
      >
        <StudioBrandMark size="sm" />
        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-white">
          {creatorProfile.display_name}
        </p>
        <Link
          className="tap-highlight shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[0.65rem] font-semibold text-zinc-200"
          href="/"
        >
          ChapMee
        </Link>
      </div>
    </header>
  );
}
