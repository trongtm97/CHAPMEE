import { permanentRedirect } from "next/navigation";

type LegacyGenrePageProps = {
  params: Promise<{ slug: string }>;
};

/** Canonical genre URLs live under `/the-loai/[slug]`. */
export default async function LegacyGenreRedirect({ params }: LegacyGenrePageProps) {
  const { slug } = await params;
  permanentRedirect(`/the-loai/${encodeURIComponent(slug.trim())}`);
}
