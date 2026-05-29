import Link from "next/link";
import { SectionHeader } from "@/components/ui";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { NewChapterCard } from "@/components/home/NewChapterCard";
import type { NewChapterItem } from "@/lib/stories/getHomeStories";

type NewChaptersSectionProps = {
  chapters: NewChapterItem[];
};

export function NewChaptersSection({ chapters }: NewChaptersSectionProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        action={
          <Link
            className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200 transition hover:text-cyan-100"
            href="/discover"
          >
            Xem thêm
          </Link>
        }
        subtitle="Những chap mới vừa lên sóng, đọc nhanh là có ngay cú lật."
        title="Chương mới hôm nay"
      />
      {chapters.length === 0 ? (
        <HomeEmptyState
          description="Những câu chuyện đầu tiên đang được chuẩn bị."
          title="Chưa có chương mới"
        />
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter) => (
            <NewChapterCard chapter={chapter} key={chapter.id} />
          ))}
        </div>
      )}
    </section>
  );
}
