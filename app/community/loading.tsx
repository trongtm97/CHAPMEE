import { COMMUNITY_PAGE_SHELL_CLASS } from "@/components/community/community-page-shell";
import { CommunityPostCardSkeleton } from "@/components/community/CommunityPostCardSkeleton";

export default function CommunityLoading() {
  return (
    <section className={`page-stack space-y-4 ${COMMUNITY_PAGE_SHELL_CLASS}`}>
      <div className="space-y-2">
        <div className="h-7 w-36 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-full max-w-sm animate-pulse rounded bg-white/10" />
      </div>
      <div className="h-11 w-full animate-pulse rounded-full bg-white/10" />
      <CommunityPostCardSkeleton />
      <CommunityPostCardSkeleton />
    </section>
  );
}
