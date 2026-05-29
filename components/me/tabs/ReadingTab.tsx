import Link from "next/link";
import { ContinueReadingSection } from "@/components/me/ContinueReadingSection";
import { buildMeReadingHref } from "@/lib/me/profileQuickActions";
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
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Đọc tiếp</h2>
          <SectionLink href={buildMeReadingHref("continue")} label="Mở tủ truyện" />
        </div>
        {hasContinue ? (
          <ContinueReadingSection
            compact
            items={data.currentlyReading}
            maxItems={3}
            showHeader={false}
          />
        ) : (
          <p className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-xs text-zinc-500">
            Bạn chưa đọc truyện nào.{" "}
            <Link className="font-semibold text-cyan-200" href="/discover">
              Khám phá truyện
            </Link>
          </p>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Đã lưu</h2>
          <SectionLink
            href={buildMeReadingHref("saved")}
            label={hasSaved ? "Xem tất cả" : "Mở tủ truyện"}
          />
        </div>
        {hasSaved ? (
          <p className="text-xs text-zinc-500">
            {data.readerProfile.metrics.savedStoriesCount} truyện đã lưu.
          </p>
        ) : (
          <p className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-xs text-zinc-500">
            Bạn chưa lưu truyện nào. Lưu từ trang truyện để xem tại đây.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Tủ truyện của tôi</h2>
          <SectionLink
            href={buildMeReadingHref("collections")}
            label={hasCollections ? "Xem tất cả" : "Tạo tủ"}
          />
        </div>
        {hasCollections ? (
          <p className="text-xs text-zinc-500">{data.collections.length} tủ truyện.</p>
        ) : (
          <p className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-xs text-zinc-500">
            Tạo tủ để gom truyện theo gu đọc của bạn.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Theo dõi</h2>
          <SectionLink href={buildMeReadingHref("groups")} label="Xem tất cả" />
        </div>
        {hasGroups ? (
          <p className="text-xs text-zinc-500">
            Bạn đang theo dõi {data.communityGroupsCount} nhóm truyện.
          </p>
        ) : (
          <p className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-xs text-zinc-500">
            Theo dõi tác giả, truyện hoặc nhóm từ trang chi tiết.
          </p>
        )}
      </section>

      {data.readerProfile.favoriteGenres.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">Thể loại yêu thích</h2>
          <div className="flex flex-wrap gap-2 rounded-xl border border-white/6 bg-white/[0.02] p-3">
            {data.readerProfile.favoriteGenres.map((genre) => (
              <span
                className="chap-pill px-2.5 py-1.5 text-xs font-semibold text-zinc-100"
                key={genre.name}
              >
                {genre.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
