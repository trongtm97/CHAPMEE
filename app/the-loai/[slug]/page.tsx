import GenrePage, { generateMetadata as generateGenreMetadata } from "@/app/genres/[slug]/page";
import { getPublicGenreSlugs } from "@/lib/seo/static-params";

type GenreRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: GenreRouteProps) {
  return generateGenreMetadata({ params });
}

export async function generateStaticParams() {
  const slugs = await getPublicGenreSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function GenreSeoRoute({ params }: GenreRouteProps) {
  return <GenrePage params={params} />;
}
