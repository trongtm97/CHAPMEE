import { DesktopStoryCatalogLayout } from "@/components/stories/DesktopStoryCatalogLayout";
import { MobileStoryCatalogLayout } from "@/components/stories/MobileStoryCatalogLayout";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus, StoryCatalogStory } from "@/types/story";

type StoryCatalogPageProps = {
  stories: StoryCatalogStory[];
  genres: StoryCatalogGenre[];
  query: string;
  genre: string;
  sort: StoryCatalogSort;
  status: StoryCatalogStatus;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export function StoryCatalogPage(props: StoryCatalogPageProps) {
  return (
    <>
      <MobileStoryCatalogLayout {...props} />
      <DesktopStoryCatalogLayout {...props} />
    </>
  );
}
