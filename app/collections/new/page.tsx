import { CollectionEditor } from "@/components/collections";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";

export const dynamic = "force-dynamic";

export default function NewCollectionPage() {
  return (
    <div className="space-y-4">
      <MobileBackHeader fallbackHref="/me?tab=reading" title="Tạo tủ truyện" />
      <section className="space-y-3">
        <p className="page-kicker">Tủ truyện</p>
        <h1 className="page-title">Tạo tủ truyện mới</h1>
        <p className="page-copy">Tạo một list để thể hiện gu đọc của bạn và chia sẻ cho người khác.</p>
      </section>
      <CollectionEditor mode="create" />
    </div>
  );
}
