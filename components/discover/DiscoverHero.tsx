import Link from "next/link";
import { HotBadge } from "@/components/common/HotBadge";
import { AppSearchBar } from "@/components/ui/AppSearchBar";


const quickFilters = [

  { href: "/truyen-sang-tac", label: "Truyện sáng tác", highlight: true, hot: true },

  { href: "/truyen-dich", label: "Truyện dịch", highlight: false, hot: false },

  { href: "/media?tab=audio", label: "Audio", highlight: false, hot: false },

  { href: "/media?tab=video", label: "Video", highlight: false, hot: false },

  { href: "/bai-viet", label: "Bài viết", highlight: false, hot: false },

  { href: "/bang-xep-hang", label: "BXH", highlight: false, hot: false },

  { href: "/the-loai", label: "Thể loại", highlight: false, hot: false }

] as const;



type DiscoverHeroProps = {

  query?: string;

};



export function DiscoverHero({ query = "" }: DiscoverHeroProps) {

  return (
    <header className="space-y-3 md:space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(103,232,249,0.12),rgba(255,255,255,0.02)_45%,rgba(8,12,18,0.9))] p-4 md:p-5">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/90">ChapMee</p>
          <h1 className="text-xl font-black tracking-tight text-zinc-50 md:text-2xl">Khám phá</h1>
          <p className="max-w-lg text-sm leading-relaxed text-zinc-400">
            Truyện sáng tác, truyện dịch, audio, video và bài viết — tìm nội dung phù hợp trong vài
            giây.
          </p>
        </div>
      </div>

      <AppSearchBar

        catalogNavigation

        className="w-full"

        defaultValue={query}

        placeholder="Tìm truyện, tác giả, thể loại..."

        variant="discover"

      />



      <nav

        aria-label="Lọc nhanh"

        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"

      >

        {quickFilters.map((chip) => (

          <Link

            className={`inline-flex shrink-0 snap-start items-center rounded-full border py-1.5 text-xs font-semibold transition ${

              chip.highlight

                ? "gap-2 border-orange-400/45 bg-orange-500/15 pl-3 pr-3.5 text-orange-50 hover:bg-orange-500/25"

                : "border-white/10 bg-white/[0.03] px-3 text-zinc-300 hover:border-white/20 hover:text-white"

            }`}

            href={chip.href}

            key={chip.href}

          >

            <span>{chip.label}</span>
            {chip.hot ? <HotBadge /> : null}
          </Link>

        ))}

      </nav>

    </header>

  );

}


