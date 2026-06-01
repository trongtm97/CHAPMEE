import { RankingsPageByType, metadata as baseMetadata } from "@/app/rankings/page";
import { findRankingTabBySlug } from "@/types/ranking-board";
import type { Metadata } from "next";

type RouteProps = {
  params: Promise<{ type: string }>;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { type } = await params;
  const tab = findRankingTabBySlug(type);
  return {
    ...baseMetadata,
    title: `${tab.label} · Bảng xếp hạng ChapMee`,
    description: tab.description
  };
}

export default async function RankingsTypeRoute({ params }: RouteProps) {
  const { type } = await params;
  return <RankingsPageByType typeSlug={type} />;
}

export async function generateStaticParams() {
  return [];
}
