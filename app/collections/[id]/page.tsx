import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvatarFallback, Badge, Card, EmptyState } from "@/components/ui";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { ShareButton } from "@/components/share/ShareButton";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { getCollectionById } from "@/lib/data/collections";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { getStoryDetailHref } from "@/lib/stories/story-routes";

type CollectionPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { id } = await params;
  const collection = await getCollectionById(id);
  if (!collection) {
    return {
      title: "Không tìm thấy tủ truyện",
      description: "Tủ truyện này không khả dụng hoặc đang ở chế độ riêng tư.",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: collection.title,
    description: collection.description ?? `Tủ truyện ${collection.title} trên ChapMee.`,
    alternates: { canonical: buildCanonicalUrl(`/collections/${collection.id}`) ?? undefined }
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params;
  const collection = await getCollectionById(id);

  if (!collection) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {collection.isOwner ? (
        <MobileBackHeader fallbackHref="/me?tab=reading" title={collection.title} />
      ) : null}
      <section className="space-y-3">
        <p className="page-kicker">Collection công khai</p>
        <h1 className="page-title">{collection.title}</h1>
        {collection.description ? <p className="page-copy">{collection.description}</p> : null}
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
          <span>{collection.itemCount} truyện</span>
          <span>•</span>
          <span>{collection.visibility === "public" ? "Công khai" : "Riêng tư"}</span>
          {collection.isOwner ? (
            <Badge variant="success">Bạn là chủ tủ</Badge>
          ) : null}
        </div>
      </section>

      <Card className="space-y-4 overflow-hidden p-0">
        <div className="bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(17,24,39,0.95))] p-4">
          <div className="flex items-center gap-3">
            <AvatarFallback name={collection.user.displayName ?? collection.user.username ?? "ChapMee"} src={collection.user.avatarUrl ?? null} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">{collection.user.displayName ?? collection.user.username ?? "ChapMee user"}</p>
              <p className="truncate text-xs text-zinc-200/80">Curator · {collection.itemCount} truyện</p>
            </div>
            <ShareButton
              payload={{
                kind: "story",
                title: collection.title,
                text: collection.description ?? collection.title,
                url: getShareUrl(`/collections/${collection.id}`),
                ctaLabel: "Mở collection"
              }}
            />
          </div>
        </div>
      </Card>

      {collection.items.length === 0 ? (
        <EmptyState title="Collection này chưa có truyện" description="Chủ tủ chưa thêm truyện nào. Hãy quay lại sau." />
      ) : (
        <div className="space-y-3">
          {collection.items.map((item, index) => (
            <Link
              href={getStoryDetailHref({
                slug: item.slug,
                public_code: item.publicCode
              })}
              key={item.id}
            >
              <Card className="p-3 transition hover:border-cyan-300/25 hover:bg-white/[0.05]">
                <div className="grid grid-cols-[3rem_1fr] gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-base font-black text-cyan-200">{index + 1}</div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-white">{item.title}</h3>
                    <p className="truncate text-xs text-zinc-400">{item.authorName ?? "Tác giả ChapMee"}{item.genreName ? ` • ${item.genreName}` : ""}</p>
                    {item.hook ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-300">{item.hook}</p> : null}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
