import type { Metadata } from "next";
import Link from "next/link";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tác giả trên ChapMee",
  description: "Danh sách tác giả hoạt động để theo dõi và khám phá tác phẩm.",
  alternates: { canonical: buildCanonicalUrl("/tac-gia") }
};

type AuthorRow = {
  id: string;
  pen_name: string;
  bio: string | null;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

export default async function AuthorsIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("creator_profiles")
    .select("id, pen_name, bio, profiles!inner(username)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(120);

  const authors = (data ?? []) as AuthorRow[];

  return (
    <section className="space-y-6">
      <div>
        <p className="page-kicker">Tác giả</p>
        <h1 className="page-title">Cộng đồng tác giả ChapMee</h1>
        <p className="page-copy">Theo dõi tác giả và khám phá truyện mới từ từng hồ sơ.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {authors.map((author) => {
          const profile = Array.isArray(author.profiles) ? author.profiles[0] : author.profiles;
          const username = profile?.username?.trim();
          if (!username) return null;

          return (
            <Link
              className="chap-card block space-y-2 p-4 transition hover:border-cyan-300/30"
              href={`/tac-gia/${username}`}
              key={author.id}
            >
              <p className="text-base font-bold text-white">{author.pen_name}</p>
              <p className="line-clamp-2 text-sm text-zinc-400">{author.bio ?? "Tác giả ChapMee"}</p>
              <p className="text-xs text-zinc-500">@{username}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
