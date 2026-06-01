import { RankingsPageByType } from "@/app/rankings/page";
import type { Metadata } from "next";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Bảng xếp hạng ${slug} · ChapMee`,
    description: `Top truyện thể loại ${slug} trên ChapMee.`
  };
}

export default async function GenreRankingsRoute({ params }: RouteProps) {
  const { slug } = await params;

  return (
    <RankingsPageByType
      typeSlug="theo-the-loai"
      initialGenreSlug={slug}
    />
  );
}
