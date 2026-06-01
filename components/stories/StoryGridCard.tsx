import Link from "next/link";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { StoryImageView } from "@/components/common/StoryImageView";
import {
  contentCard,
  contentCardPad,
  contentCtaPrimary
} from "@/components/ui/content-card-styles";

type StoryGridCardStory = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  genreName: string | null;
  coverUrl: string | null;
};

type StoryGridCardProps = {
  story: StoryGridCardStory;
};

export function StoryGridCard({ story }: StoryGridCardProps) {
  return (
    <Link
      className={`tap-highlight flex h-full min-h-[11.5rem] flex-col ${contentCard} ${contentCardPad}`}
      href={getStoryDetailHref({ slug: story.slug, public_code: story.publicCode })}
    >
      <StoryImageView
        story={{
          title: story.title,
          coverUrl: story.coverUrl
        }}
        usage="libraryCard"
        wrapperClassName="mx-auto w-full max-w-[4.5rem] overflow-hidden rounded-lg border border-white/8"
      />
      <div className="mt-2 flex flex-1 flex-col">
        {story.genreName ? (
          <span className="mb-0.5 truncate text-[0.62rem] font-medium text-zinc-500">
            {story.genreName}
          </span>
        ) : (
          <span className="mb-0.5 block h-[0.9rem]" aria-hidden />
        )}
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white">
          {story.title}
        </h3>
        <span className={`${contentCtaPrimary} mt-auto w-full justify-center pt-2`}>
          Đọc ngay
        </span>
      </div>
    </Link>
  );
}
