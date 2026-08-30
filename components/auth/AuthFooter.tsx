import Link from "next/link";
import {
  FOOTER_MOBILE_QUICK_LINKS,
  FOOTER_QUICK_LINKS
} from "@/lib/footer-site-links";

const AUTH_LINKS = [
  "/about",
  "/contact",
  "/legal",
  "/legal/terms",
  "/legal/privacy",
  "/content-policy"
];

const LOGIN_COMPACT_LINKS = [
  { href: "/about", label: "Giới thiệu" },
  { href: "/contact", label: "Liên hệ" },
  { href: "/legal/terms", label: "Điều khoản" },
  { href: "/legal/privacy", label: "Quyền riêng tư" }
] as const;

type AuthFooterProps = {
  compact?: boolean;
};

export function AuthFooter({ compact = false }: AuthFooterProps) {
  if (compact) {
    return (
      <footer className="relative border-t border-white/[0.08] bg-[#090d13]/55 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {LOGIN_COMPACT_LINKS.map((link) => (
              <Link
                className="text-xs text-zinc-500 transition hover:text-zinc-200"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-[0.6875rem] text-zinc-600">
            © {new Date().getFullYear()} ChapMee
          </p>
        </div>
      </footer>
    );
  }

  const desktopLinks = FOOTER_QUICK_LINKS.filter((link) =>
    AUTH_LINKS.includes(link.href)
  );
  const mobileLinks = FOOTER_MOBILE_QUICK_LINKS.filter((link) =>
    AUTH_LINKS.includes(link.href)
  );

  return (
    <footer className="border-t border-white/10 bg-[#090d13]/92">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 md:flex">
          {desktopLinks.map((link) => (
            <Link
              className="text-sm text-zinc-400 transition hover:text-zinc-100"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:hidden">
          {mobileLinks.map((link) => (
            <Link
              className="text-sm text-zinc-400 transition hover:text-zinc-100"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          © {new Date().getFullYear()} ChapMee. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
