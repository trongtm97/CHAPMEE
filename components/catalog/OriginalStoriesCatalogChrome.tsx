import Link from "next/link";
import { ChapMeeLogo } from "@/components/brand/ChapMeeLogo";

const quickSections = [
  { label: "Mới cập nhật", href: "/truyen-sang-tac?sort=updated" },
  { label: "Đang nổi", href: "/truyen-sang-tac?sort=hot" },
  { label: "Được đề cử", href: "/truyen-sang-tac?sort=saved" },
  { label: "Tác giả mới", href: "/truyen-sang-tac?sort=new" },
  { label: "Theo thể loại", href: "/truyen-sang-tac" }
] as const;

type OriginalStoriesCatalogChromeProps = {
  children: React.ReactNode;
  storyCount?: number;
};

/** Khung trang Truyện Sáng Tác — palette gradient logo ChapMee (cam → hồng). */
export function OriginalStoriesCatalogChrome({
  children,
  storyCount
}: OriginalStoriesCatalogChromeProps) {
  return (
    <div className="original-stories-catalog relative space-y-5 md:space-y-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-6 top-0 h-56 w-56 rounded-full bg-orange-500/12 blur-3xl md:-left-12 md:h-72 md:w-72"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-24 h-48 w-48 rounded-full bg-pink-500/10 blur-3xl md:h-64 md:w-64"
      />

      <header className="relative overflow-hidden rounded-2xl border border-orange-400/20 bg-[#121018]/80 p-5 shadow-[0_24px_60px_-28px_rgba(249,115,22,0.55)] backdrop-blur-sm md:rounded-3xl md:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/22 via-rose-500/12 to-pink-500/18"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-orange-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-14 left-1/4 h-40 w-40 rounded-full bg-pink-500/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/50 to-transparent"
        />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-gradient-to-r from-orange-500/25 via-rose-500/20 to-pink-500/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-50 shadow-[0_0_24px_-8px_rgba(236,72,153,0.8)]">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-orange-300 to-pink-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                />
                Originals
              </span>
              {typeof storyCount === "number" && storyCount > 0 ? (
                <span className="text-xs font-medium text-orange-100/75">
                  {storyCount.toLocaleString("vi-VN")} tác phẩm
                </span>
              ) : null}
            </div>

            <div className="space-y-2">
              <h1 className="bg-gradient-to-r from-orange-100 via-rose-50 to-pink-100 bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl">
                Truyện Sáng Tác
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-orange-50/85 md:text-[0.95rem]">
                Tác phẩm do cộng đồng ChapMee sáng tác — nơi giọng kể chuyện gốc được ưu tiên trên hệ sinh
                thái creator.
              </p>
            </div>

            <LogoWaveAccent aria-hidden />
          </div>

          <div className="flex shrink-0 items-center justify-start md:justify-end">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <ChapMeeLogo height={26} priority />
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Lọc nhanh truyện sáng tác" className="relative flex flex-wrap gap-2">
        {quickSections.map((item) => (
          <Link
            className="group inline-flex items-center rounded-full border border-orange-400/25 bg-gradient-to-r from-orange-500/10 via-rose-500/8 to-pink-500/10 px-3.5 py-2 text-xs font-semibold text-orange-50/95 shadow-[0_0_20px_-12px_rgba(249,115,22,0.9)] transition duration-200 hover:-translate-y-0.5 hover:border-pink-400/35 hover:from-orange-500/20 hover:via-rose-500/15 hover:to-pink-500/20 hover:text-white hover:shadow-[0_0_28px_-10px_rgba(236,72,153,0.75)]"
            href={item.href}
            key={item.label}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="relative">{children}</div>
    </div>
  );
}

function LogoWaveAccent({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`mt-1 h-3 w-28 text-pink-400/90 ${className}`}
      fill="none"
      viewBox="0 0 112 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 8.5C18 4.5 28 10 42 6.5C56 3 68 9.5 82 5.5C94 2.5 102 7 108 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
      <path
        d="M8 10.5C22 7 34 11 50 8C64 5.5 76 10.5 92 7.5"
        opacity="0.55"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}
