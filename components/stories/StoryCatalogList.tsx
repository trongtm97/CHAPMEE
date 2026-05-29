import Link from "next/link";
import { MobileStoryListItem } from "@/components/stories/MobileStoryListItem";
import type { StoryCatalogStory } from "@/types/story";

type StoryCatalogListProps = {
  stories: StoryCatalogStory[];
};

export function StoryCatalogList({ stories }: StoryCatalogListProps) {
  if (stories.length === 0) {
    return (
      <div className="chap-card-soft space-y-3 p-4 text-sm text-zinc-300 lg:hidden">
        <p>Không tìm thấy truyện phù hợp.</p>
        <Link className="text-xs font-bold text-cyan-200" href="/truyen">
          Xóa bộ lọc
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2 lg:hidden">
      {stories.map((story) => (
        <li key={story.id}>
          <MobileStoryListItem story={story} />
        </li>
      ))}
    </ul>
  );
}
