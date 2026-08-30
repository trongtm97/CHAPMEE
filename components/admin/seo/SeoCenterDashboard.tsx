import Link from "next/link";

type DashboardCard = {
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
  badge?: string;
};

const CARDS: DashboardCard[] = [
  {
    title: "SEO Settings",
    description: "Site name, title/description templates, default OG image và robots mặc định.",
    href: "/admin/seo/settings"
  },
  {
    title: "SEO theo trang",
    description:
      "Chọn trang chủ, danh mục truyện, Khám phá… — chỉnh title, description, ảnh Google/Facebook.",
    href: "/admin/seo/pages"
  },
  {
    title: "Metadata Overrides",
    description: "Danh sách override nâng cao theo path hoặc entity (story, taxonomy, …).",
    href: "/admin/seo/overrides"
  },
  {
    title: "SEO Content Blocks",
    description: "Markdown blocks trước footer theo page type.",
    href: "/admin/seo/content-blocks"
  },
  {
    title: "Redirects",
    description: "Redirect thủ công + đổi slug — 301/302, hit tracking, cảnh báo loop.",
    href: "/admin/seo/redirects"
  },
  {
    title: "404 Monitor",
    description: "Theo dõi URL 404 và tạo redirect từ path lỗi.",
    href: "/admin/seo/404-monitor"
  },
  {
    title: "Sitemap / Robots",
    description: "robots.txt, sitemap index, segment toggles và noindex policy.",
    href: "/admin/seo/sitemap"
  },
  {
    title: "Coming soon & chặn crawler",
    description: "Bật/tắt trang chờ ra mắt và chặn Google/Bing tạm thời.",
    href: "/admin/settings/launch"
  },
  {
    title: "SEO Audit",
    description: "Chạy audit on-page, heading và metadata findings.",
    href: "/admin/seo/control?tab=audit"
  }
];

type SeoCenterDashboardProps = {
  overrideCount?: number;
};

export function SeoCenterDashboard({ overrideCount }: SeoCenterDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">SEO Center</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Quản lý metadata toàn site, override theo trang và preview Google/Social — tương tự
          RankMath.
          {typeof overrideCount === "number" ? (
            <span className="ml-1 text-zinc-500">· {overrideCount} override đang lưu.</span>
          ) : null}
        </p>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/90">
        Trang private (/admin, /studio, /me, /messages, /login, /register, /payment, …) nên{" "}
        <strong>noindex</strong> — engine áp dụng qua route rules; không cần override từng trang
        private.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card) => {
          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-zinc-100">{card.title}</h2>
                {card.badge ? (
                  <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    {card.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{card.description}</p>
            </>
          );

          if (card.disabled || !card.href) {
            return (
              <div
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 opacity-60"
                key={card.title}
              >
                {inner}
              </div>
            );
          }

          return (
            <Link
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
              href={card.href}
              key={card.title}
            >
              {inner}
              <p className="mt-3 text-xs font-semibold text-cyan-300/80 group-hover:text-cyan-200">
                Mở →
              </p>
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-zinc-500">
        Control Center (rules, taxonomy, templates):{" "}
        <Link className="text-cyan-300 hover:text-cyan-200" href="/admin/seo/control">
          /admin/seo/control
        </Link>
      </p>
    </div>
  );
}
