import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeroExperiment } from "@/components/experiments/LandingHeroExperiment";
import { Card } from "@/components/ui";
import { getPublicStories } from "@/lib/supabase/public-content";
import { buildCanonicalUrl, getDefaultOgImage } from "@/lib/seo/metadata";

const genres = ["Ngôn tình", "Học đường", "Kinh dị", "Xuyên không", "Fantasy", "Drama gia đình"];

export async function generateMetadata(): Promise<Metadata> {
  const title = "ChapMee — Lướt truyện cuốn như TikTok";
  const description = "Đọc truyện ngắn, theo dõi tác giả, bình luận và vote hướng truyện ngay trên điện thoại.";
  const canonical = buildCanonicalUrl("/landing");

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      ...(canonical ? { url: canonical } : {}),
      images: [{ url: getDefaultOgImage(), alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [getDefaultOgImage()]
    }
  };
}

export default async function LandingPage() {
  const hotStories = await getPublicStories(3);

  return (
    <div className="mx-auto w-full max-w-[42rem] space-y-6 py-4 sm:space-y-8 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "ChapMee",
            url: buildCanonicalUrl("/landing"),
            description: "Đọc truyện ngắn, theo dõi tác giả, bình luận và vote hướng truyện ngay trên điện thoại."
          })
        }}
      />

      <LandingHeroExperiment />

      <section className="grid gap-3 sm:grid-cols-2">
        <Card className="space-y-2 p-5"><h2 className="text-lg font-black text-white">Dành cho người đọc</h2><p className="text-sm leading-6 text-zinc-400">Lướt truyện, follow tác giả, bình luận và lưu truyện đọc sau.</p></Card>
        <Card className="space-y-2 p-5"><h2 className="text-lg font-black text-white">Dành cho tác giả</h2><p className="text-sm leading-6 text-zinc-400">Đăng truyện, xây fan, nhận feedback và phát triển cộng đồng độc giả.</p></Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black text-white">Thể loại nổi bật</h2>
        <div className="flex flex-wrap gap-2">{genres.map((genre) => <span className="chap-pill px-3 py-2 text-sm font-semibold text-zinc-100" key={genre}>{genre}</span>)}</div>
      </section>

      {hotStories.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-black text-white">Truyện hot</h2>
          <div className="grid gap-3">
            {hotStories.map((story) => (
              <Card className="space-y-2 p-5" key={story.id}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">{story.genreName ?? "ChapMee"}</p>
                <h3 className="text-lg font-black text-white">{story.title}</h3>
                <p className="text-sm leading-6 text-zinc-400">{story.hook ?? "Đọc tiếp trên ChapMee"}</p>
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>{story.creatorName ?? "Tác giả ChapMee"}</span>
                  <Link className="font-bold text-cyan-200" href={`/stories/${story.slug}`}>Đọc tiếp</Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-black text-white">Tính năng nổi bật</h2>
        <div className="grid gap-3">
          <Card className="p-5 text-sm leading-6 text-zinc-300">Lướt truyện mượt trên điện thoại với UI mobile-first.</Card>
          <Card className="p-5 text-sm leading-6 text-zinc-300">Public preview cho story, author và thể loại để người dùng tìm thấy nội dung trên Google và khi share link.</Card>
        </div>
      </section>

      <footer className="space-y-3 border-t border-white/10 pt-5 text-sm text-zinc-500">
        <div className="flex flex-wrap gap-3">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/community-guidelines">Community Guidelines</Link>
          <Link href="/content-policy">Content Policy</Link>
        </div>
      </footer>
    </div>
  );
}
