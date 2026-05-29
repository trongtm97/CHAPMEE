import Link from "next/link";
import { Card, SectionHeader, AvatarFallback } from "@/components/ui";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import type { FeaturedCreator } from "@/lib/stories/getHomeStories";

type FeaturedCreatorsSectionProps = {
  creators: FeaturedCreator[];
};

export function FeaturedCreatorsSection({
  creators
}: FeaturedCreatorsSectionProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Những tác giả đang có nhịp đăng ổn và hook dễ cuốn."
        title="Tác giả nổi bật"
      />
      {creators.length === 0 ? (
        <HomeEmptyState
          description="Khi có tác giả hoạt động, họ sẽ hiện ở đây với vài dòng giới thiệu ngắn."
          title="Chưa có tác giả nổi bật"
        />
      ) : (
        <div className="grid gap-3">
          {creators.map((creator) => (
            <Link href={`/creators/${creator.id}`} key={creator.id}>
              <Card className="flex items-start gap-3 border-white/8 bg-white/[0.035] transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-[var(--surface-soft)]">
                <AvatarFallback
                  className="shrink-0"
                  name={creator.penName}
                  size="md"
                  src={creator.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[1.02rem] font-bold text-white">
                    {creator.penName}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[0.95rem] leading-6 text-zinc-300">
                    {creator.bio ?? "Tác giả ChapMee"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
                  Xem hồ sơ
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
