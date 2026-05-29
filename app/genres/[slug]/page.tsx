import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/share/ShareButton";
import { Card } from "@/components/ui";
import { buildGenreMetadata } from "@/lib/seo/build-metadata";
import { getPublicGenresWithContent } from "@/lib/supabase/public-content";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { createClient } from "@/lib/supabase/server";

type GenrePageProps = { params: Promise<{ slug: string }> };

type GenreStoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const genres = await getPublicGenresWithContent();
  const genre = genres.find((item) => item.slug === slug);
  if (!genre) {
    return {
      title: "Không tìm thấy thể loại",
      description: "Thể loại này không tồn tại hoặc chưa có truyện công khai.",
      robots: { index: false, follow: false }
    };
  }
  return buildGenreMetadata({ name: genre.name, slug });
}

export default async function GenrePage({ params }: GenrePageProps) {
  const { slug } = await params;
  const genres = await getPublicGenresWithContent();
  const genre = genres.find((item) => item.slug === slug);
  if (!genre || genre.story_count === 0) notFound();

  const supabase = await createClient();
  const { data: storyRows } = await supabase
    .from("stories")
    .select("id, title, slug, hook")
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .eq("genres.slug", slug)
    .order("published_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="page-kicker">Genre</p>
        <h1 className="page-title">{genre.name}</h1>
        <p className="page-copy">Khám phá truyện theo đúng gu đọc của bạn.</p>
      </section>

      <div className="grid gap-3">
        {(storyRows ?? []).map((story) => {
          const item = story as GenreStoryRow;
          return (
            <Card className="space-y-2 p-4" key={item.id}>
              <p className="text-base font-black text-white">{item.title}</p>
              <p className="text-sm leading-6 text-zinc-400">{item.hook ?? "ChapMee story"}</p>
              <div className="flex justify-end">
                <ShareButton
                  label="Chia sẻ"
                  payload={{
                    kind: "story",
                    title: item.title,
                    text: item.hook ?? item.title,
                    url: getShareUrl(`/stories/${item.slug}`),
                    slug: item.slug,
                    targetId: item.id,
                    targetType: "story"
                  }}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
