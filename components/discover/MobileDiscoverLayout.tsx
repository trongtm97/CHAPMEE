import { DiscoverFeed } from "@/components/discover/DiscoverFeed";
import type { DiscoverData } from "@/lib/discover/getDiscoverData";

type MobileDiscoverLayoutProps = {
  data: DiscoverData;
  query: string;
  activeGenre: string;
};

export function MobileDiscoverLayout({ data, query }: MobileDiscoverLayoutProps) {
  return (
    <div className="pb-2 md:hidden">
      <DiscoverFeed data={data} query={query} />
    </div>
  );
}
