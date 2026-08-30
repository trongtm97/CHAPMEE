import Image from "next/image";
import Link from "next/link";
import { DmcaProtectionBadge } from "@/components/layout/DmcaProtectionBadge";
import { FooterSocialLinks } from "@/components/layout/FooterSocialLinks";
import {
  FOOTER_BRAND_DESCRIPTION,
  FOOTER_MOBILE_QUICK_LINKS,
  FOOTER_QUICK_LINKS
} from "@/lib/footer-site-links";
import { CHAPMEE_DMCA_BADGE } from "@/lib/compliance/chapmee-dmca-badge";
import { formatFooterCopyright, type FooterConfig } from "@/lib/settings/footer-config";

export type FooterViewProps = {
  config: FooterConfig;
  logoUrl?: string | null;
  preview?: boolean;
  className?: string;
};

function FooterColumnHeading({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
      {children}
    </p>
  );
}

function FooterQuickLinks({
  links,
  className = ""
}: {
  links: ReadonlyArray<{ label: string; href: string }>;
  className?: string;
}) {
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {links.map((link) => (
        <li key={link.href}>
          <Link
            className="inline-block text-sm text-zinc-400 transition hover:text-zinc-200"
            href={link.href}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FooterDmcaBadge({ config }: { config: FooterConfig["compliance"]["dmca"] }) {
  if (!config.enabled) {
    return <DmcaProtectionBadge />;
  }

  const usesOfficialBadge =
    config.mode === "image" &&
    (!config.imageUrl.trim() ||
      config.imageUrl.trim() === CHAPMEE_DMCA_BADGE.imageUrl) &&
    (!config.linkUrl.trim() || config.linkUrl.trim() === CHAPMEE_DMCA_BADGE.statusUrl);

  if (usesOfficialBadge) {
    return <DmcaProtectionBadge />;
  }

  if (config.mode === "image" && config.imageUrl.trim()) {
    const img = (
      <Image
        alt={CHAPMEE_DMCA_BADGE.alt}
        className="h-4 w-[120px] object-contain opacity-90"
        height={16}
        src={config.imageUrl.trim()}
        unoptimized
        width={120}
      />
    );
    const href = config.linkUrl.trim() || CHAPMEE_DMCA_BADGE.statusUrl;
    return (
      <a
        className="dmca-badge inline-flex shrink-0"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        title={CHAPMEE_DMCA_BADGE.title}
      >
        {img}
      </a>
    );
  }

  if (config.mode === "link" && config.linkUrl.trim()) {
    return (
      <a
        className="dmca-badge text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
        href={config.linkUrl.trim()}
        rel="noopener noreferrer"
        target="_blank"
        title={CHAPMEE_DMCA_BADGE.title}
      >
        DMCA
      </a>
    );
  }

  return <DmcaProtectionBadge />;
}

export function FooterView({ config, logoUrl, preview, className = "" }: FooterViewProps) {
  if (!config.enabled) {
    return preview ? (
      <p className="text-sm text-zinc-500">Footer đang tắt (enabled = false).</p>
    ) : null;
  }

  const brandName = config.brand.name.trim() || "ChapMee";
  const brandDescription =
    config.brand.description.trim() || FOOTER_BRAND_DESCRIPTION;
  const copyright = formatFooterCopyright(config);

  return (
    <footer
      className={`border-t border-white/10 bg-[#070b10]/95 text-zinc-300 ${className}`}
    >
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="footer-compact-grid grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="min-w-0 space-y-2 lg:max-w-xs">
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <Image
                  alt={brandName}
                  className="h-7 w-7 shrink-0 rounded-lg object-cover"
                  height={28}
                  src={logoUrl}
                  unoptimized
                  width={28}
                />
              ) : null}
              <p className="text-sm font-semibold text-zinc-100">{brandName}</p>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm sm:text-zinc-400">
              {brandDescription}
            </p>
            <FooterSocialLinks className="pt-1" />
          </div>

          <nav aria-label="Liên kết nhanh" className="min-w-0">
            <FooterColumnHeading>Liên kết nhanh</FooterColumnHeading>
            <div className="hidden md:block">
              <FooterQuickLinks links={FOOTER_QUICK_LINKS} />
            </div>
            <div className="md:hidden">
              <FooterQuickLinks links={FOOTER_MOBILE_QUICK_LINKS} />
            </div>
          </nav>
        </div>

        <div className="footer-bottom-bar mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {copyright ? (
            <p className="text-xs text-zinc-500">{copyright}</p>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <FooterDmcaBadge config={config.compliance.dmca} />
          </div>
        </div>
      </div>
    </footer>
  );
}
