import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/share/ShareButton";
import { Card } from "@/components/ui";
import { buildCanonicalUrl, getDefaultOgImage } from "@/lib/seo/metadata";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { createClient } from "@/lib/supabase/server";
import { getTagSlugs } from "@/lib/seo/static-params";

type TagPageProps = {
  params: Promise<{ slug: string }>;
};

type TagRow = { id: string; name: string; slug: string };
type StoryRow = { id: string; title: string; slug: string; hook: string | null };

async function getTagData(slug: string) {
  const supabase = await createClient();
  const { data: tag } = await supabase
    .from("tags")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!tag) return { tag: null, stories: [] as StoryRow[] };

  const { data: stories } = await supabase
    .from("story_tags")
    .select("stories!inner(id, title, slug, hook, visibility, status)")
    .eq("tag_id", (tag as TagRow).id)
    .eq("stories.visibility", "public")
    .in("stories.status", ["approved", "published"])
    .limit(30);

  const rows = (stories ?? []) as Array<{ stories: StoryRow | StoryRow[] | null }>;
  const mapped = rows
    .map((row) => (Array.isArray(row.stories) ? row.stories[0] : row.stories))
    .filter((story): story is StoryRow => Boolean(story?.id));

  return { tag: tag as TagRow, stories: mapped };
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { tag } = await getTagData(slug);

  if (!tag) {
    return {
      title: "Tag không tồn tại",
      description: "Không tìm thấy tag.",
      robots: { index: false, follow: false }
    };
  }

  const title = `Tag ${tag.name} trên ChapMee`;
  const description = `Đọc truyện theo tag ${tag.name} trên ChapMee.`;
  const canonical = buildCanonicalUrl(`/tag/${tag.slug}`);

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      ...(canonical ? { url: canonical } : {}),
      images: [{ url: getDefaultOgImage(), alt: tag.name }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [getDefaultOgImage()]
    }
  };
}

export async function generateStaticParams() {
  const slugs = await getTagSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const { tag, stories } = await getTagData(slug);
  if (!tag) notFound();

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="page-kicker">Tag</p>
        <h1 className="page-title">#{tag.name}</h1>
        <p className="page-copy">Khám phá truyện liên quan theo tag và tìm nội dung cùng chủ đề.</p>
      </section>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded-full border border-white/10 px-3 py-1.5 hover:border-cyan-300/40" href="/the-loai">
          Thể loại
        </Link>
        <Link className="rounded-full border border-white/10 px-3 py-1.5 hover:border-cyan-300/40" href="/discover">
          Khám phá
        </Link>
        <Link className="rounded-full border border-white/10 px-3 py-1.5 hover:border-cyan-300/40" href="/bang-xep-hang">
          Bảng xếp hạng
        </Link>
      </div>

      <div className="grid gap-3">
        {stories.map((story) => (
          <Card className="space-y-2 p-4" key={story.id}>
            <p className="text-base font-black text-white">{story.title}</p>
            <p className="text-sm leading-6 text-zinc-400">{story.hook ?? "ChapMee story"}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href={`/truyen/${story.slug}`}>
                Đọc thử
              </Link>
              <ShareButton
                label="Chia sẻ"
                payload={{
                  kind: "story",
                  title: story.title,
                  text: story.hook ?? story.title,
                  url: getShareUrl(`/truyen/${story.slug}`),
                  slug: story.slug,
                  targetId: story.id,
                  targetType: "story"
                }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
