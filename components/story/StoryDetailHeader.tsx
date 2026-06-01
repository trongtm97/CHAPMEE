"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoryDetailHref } from "@/lib/stories/story-routes";

type StoryDetailHeaderProps = {
  storySlug: string;
  storyPublicCode: string;
  storyTitle: string;
};

export function StoryDetailHeader({
  storyPublicCode,
  storySlug,
  storyTitle
}: StoryDetailHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/discover");
  }

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Quay lại"
        className="tap-highlight flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-200 hover:bg-white/[0.06]"
        onClick={handleBack}
        type="button"
      >
        <BackIcon />
      </button>
      <Link
        className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-100"
        href={getStoryDetailHref({ slug: storySlug, public_code: storyPublicCode })}
        title={storyTitle}
      >
        {storyTitle}
      </Link>
    </div>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
