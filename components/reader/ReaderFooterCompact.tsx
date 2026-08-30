import Link from "next/link";

const legalLinks = [
  { href: "/terms", label: "Điều khoản" },
  { href: "/privacy", label: "Riêng tư" },
  { href: "/content-policy", label: "Nội dung" },
  { href: "/contact", label: "Liên hệ" }
] as const;

export function ReaderFooterCompact() {
  const year = new Date().getFullYear();

  return (
    <footer className="reader-footer-compact mt-8 border-t border-white/[0.04] py-4 lg:mt-10">
      <div className="flex flex-col items-center gap-2 text-center text-[0.6875rem] text-zinc-500 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-1">
        <span>© {year} ChapMee</span>
        <span aria-hidden className="hidden text-zinc-700 sm:inline">
          ·
        </span>
        <nav aria-label="Liên kết pháp lý" className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {legalLinks.map((link) => (
            <Link
              className="hover:text-zinc-300"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
