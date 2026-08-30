import Link from "next/link";
import { ChapmeeSocialIcon } from "@/components/layout/ChapmeeSocialIcon";
import { CHAPMEE_SOCIAL_LINKS } from "@/lib/chapmee-social-links";

type FooterSocialLinksProps = {
  showHeading?: boolean;
  className?: string;
};

export function FooterSocialLinks({
  showHeading = true,
  className = ""
}: FooterSocialLinksProps) {
  return (
    <div className={className}>
      {showHeading ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Mạng xã hội
        </p>
      ) : null}
      <ul className="flex flex-wrap items-center gap-2">
        {CHAPMEE_SOCIAL_LINKS.map((link) => (
          <li key={link.platform}>
            <Link
              aria-label={link.ariaLabel}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60"
              href={link.href}
              title={link.ariaLabel}
            >
              <ChapmeeSocialIcon platform={link.platform} className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
