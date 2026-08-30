import Link from "next/link";
import { COMMUNITY_PAGE_SHELL_CLASS } from "@/components/community/community-page-shell";
import { GroupCreateForm } from "@/components/community/groups/GroupCreateForm";
import { createClient } from "@/lib/data/server";

export const dynamic = "force-dynamic";

export default async function CommunityGroupNewPage() {
  const db = await createClient();
  const { data } = await db
    .from("stories")
    .select("id, title, slug")
    .eq("visibility", "public")
    .in("status", ["approved", "published"])
    .order("published_at", { ascending: false })
    .limit(80);

  const stories = (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string
  }));

  return (
    <section className={`page-stack space-y-4 ${COMMUNITY_PAGE_SHELL_CLASS}`}>
      <header className="space-y-1">
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/community/groups"
        >
          ← Nhóm truyện
        </Link>
        <h1 className="text-xl font-black text-zinc-50">Đề xuất nhóm</h1>
        <p className="text-sm text-zinc-400">
          Đề xuất nhóm phụ cho truyện (fan theory, review, spoiler...). Nhóm chính được tạo tự
          động.
        </p>
      </header>

      <div className="chap-card-soft p-4">
        <GroupCreateForm stories={stories} />
      </div>
    </section>
  );
}
