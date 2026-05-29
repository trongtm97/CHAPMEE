import { notFound } from "next/navigation";
import { CollectionEditor } from "@/components/collections";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { EmptyState } from "@/components/ui";
import { getCollectionById } from "@/lib/supabase/collections";

type ManageCollectionPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function ManageCollectionPage({ params }: ManageCollectionPageProps) {
  const { id } = await params;
  const collection = await getCollectionById(id);

  if (!collection || !collection.isOwner) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <MobileBackHeader fallbackHref="/me?tab=reading" title="Quản lý tủ truyện" />
      <section className="space-y-3">
        <p className="page-kicker">Quản lý collection</p>
        <h1 className="page-title">{collection.title}</h1>
      </section>

      <CollectionEditor collection={collection} mode="edit" />

      <section className="space-y-3">
        <h2 className="text-xl font-black text-white">Preview</h2>
        <CollectionCard collection={collection} />
      </section>

      {collection.items.length === 0 ? (
        <EmptyState title="Collection chưa có truyện" description="Hãy thêm truyện từ Story Detail để bắt đầu curating." />
      ) : (
        <section className="space-y-3">
          <h2 className="text-xl font-black text-white">Danh sách truyện</h2>
          <div className="space-y-3">
            {collection.items.map((item, index) => (
              <div className="chap-card flex items-start justify-between gap-3 p-4" key={item.id}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">#{index + 1}</p>
                  <p className="text-base font-black text-white">{item.title}</p>
                  <p className="text-sm text-zinc-400">{item.authorName ?? "Tác giả ChapMee"}</p>
                </div>
                <span className="text-sm text-zinc-500">Sort {item.sortOrder}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
