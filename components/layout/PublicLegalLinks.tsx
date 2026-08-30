import Link from "next/link";
import {
  ABOUT_PATH,
  LEGAL_INDEX_PATH,
  PRIVACY_POLICY_LABEL,
  PRIVACY_POLICY_PATH,
  TERMS_OF_SERVICE_LABEL,
  TERMS_OF_SERVICE_PATH
} from "@/lib/legal/public-legal-links";

type PublicLegalLinksProps = {
  className?: string;
  emphasizePrivacy?: boolean;
  itemClassName?: string;
  layout?: "horizontal" | "vertical";
  showAbout?: boolean;
  showLegalIndex?: boolean;
};

function Separator() {
  return (
    <span aria-hidden="true" className="text-zinc-600">
      ·
    </span>
  );
}

function VerticalDivider() {
  return <span aria-hidden="true" className="my-1 block h-px w-full bg-white/[0.08]" />;
}

export function PublicLegalLinks({
  className = "",
  emphasizePrivacy = false,
  itemClassName = "",
  layout = "horizontal",
  showAbout = true,
  showLegalIndex = false
}: PublicLegalLinksProps) {
  const isVertical = layout === "vertical";
  const linkClass = isVertical
    ? `block whitespace-nowrap text-right transition-colors hover:text-zinc-100 ${itemClassName}`
    : `transition hover:text-zinc-200 ${itemClassName}`;

  return (
    <nav aria-label="Liên kết pháp lý" className={className}>
      {showAbout ? (
        <>
          <Link className={linkClass} href={ABOUT_PATH}>
            Giới thiệu
          </Link>
          {isVertical ? <VerticalDivider /> : <Separator />}
        </>
      ) : null}
      <Link
        className={`${linkClass} ${emphasizePrivacy ? "font-medium text-zinc-200" : ""}`}
        href={PRIVACY_POLICY_PATH}
      >
        {PRIVACY_POLICY_LABEL}
      </Link>
      {isVertical ? <VerticalDivider /> : <Separator />}
      <Link className={linkClass} href={TERMS_OF_SERVICE_PATH}>
        {TERMS_OF_SERVICE_LABEL}
      </Link>
      {showLegalIndex ? (
        <>
          {isVertical ? <VerticalDivider /> : <Separator />}
          <Link className={linkClass} href={LEGAL_INDEX_PATH}>
            Chính sách & pháp lý
          </Link>
        </>
      ) : null}
    </nav>
  );
}
