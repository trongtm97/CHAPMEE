import Link from "next/link";
import { BookshelfPreview } from "@/components/me/BookshelfPreview";
import { CollectionsPreview } from "@/components/me/CollectionsPreview";
import { ContinueListeningAudioSection } from "@/components/me/ContinueListeningAudioSection";
import { ContinueReadingSection } from "@/components/me/ContinueReadingSection";
import { buildMeReadingHref } from "@/lib/me/profileQuickActions";
import { Card } from "@/components/ui";
import type { MePageData } from "@/types/me-page";

type ReadingTabProps = {
  data: MePageData;
};

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="text-xs font-semibold text-cyan-200" href={href}>
      {label}
    </Link>
  );
}

export function ReadingTab({ data }: ReadingTabProps) {
  const hasContinue = data.currentlyReading.length > 0;
  const hasSaved = data.readerProfile.savedStories.length > 0;
  const hasCollections = data.collections.length > 0;
  const hasGroups = data.communityGroupsCount > 0;

  return (
    <div className="space-y-4">
      <ContinueListeningAudioSection
        compact
        items={data.continueListeningAudio}
        maxItems={5}
      />

      <section className="space-y-2" id="me-section-continue">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Đọc tiếp</h2>
          {hasContinue ? (
            <SectionLink href={buildMeReadingHref("continue")} label="Xem thêm" />
          ) : null}
        </div>
        <ContinueReadingSection
          compact
          items={data.currentlyReading}
          maxItems={5}
          showHeader={false}
        />
      </section>

      <section className="space-y-2" id="me-section-collections">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Tủ truyện</h2>
          <SectionLink
            href={buildMeReadingHref("collections")}
            label={hasCollections ? "Xem tất cả" : "Tạo tủ"}
          />
        </div>
        {hasCollections ? (
          <CollectionsPreview items={data.collections} showHeader={false} />
        ) : (
          <Card className="p-4 text-center">
            <p className="text-xs text-zinc-500">Chưa có tủ truyện.</p>
            <Link
              className="mt-2 inline-flex text-xs font-semibold text-cyan-200"
              href="/collections/new"
            >
              Tạo tủ đầu tiên
            </Link>
          </Card>
        )}
      </section>

      <section className="space-y-2" id="me-section-saved">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Đã lưu</h2>
          {hasSaved ? (
            <SectionLink href={buildMeReadingHref("saved")} label="Xem tất cả" />
          ) : null}
        </div>
        <BookshelfPreview
          description="Truyện bạn lưu sẽ hiện ở đây."
          emptyDescription="Lưu truyện từ trang chi tiết để đọc sau."
          emptyTitle="Chưa có truyện đã lưu"
          items={data.readerProfile.savedStories.slice(0, 5)}
          showHeader={false}
          title="Đã lưu"
        />
      </section>

      <section className="space-y-2" id="me-section-groups">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Nhóm & tác giả theo dõi</h2>
          <SectionLink href={buildMeReadingHref("groups")} label="Xem tất cả" />
        </div>
        {hasGroups ? (
          <Card className="p-3">
            <p className="text-sm text-zinc-400">
              Đang theo dõi{" "}
              <span className="font-bold text-white">{data.communityGroupsCount}</span> nhóm
              truyện.
            </p>
            <Link
              className="mt-2 inline-flex text-xs font-semibold text-cyan-200"
              href="/community?tab=following"
            >
              Mở cộng đồng
            </Link>
          </Card>
        ) : (
          <Card className="p-4 text-center text-xs text-zinc-500">
            Theo dõi tác giả hoặc nhóm từ trang truyện và cộng đồng.
          </Card>
        )}
      </section>
    </div>
  );
}
