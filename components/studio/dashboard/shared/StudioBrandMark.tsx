import Link from "next/link";
import { ChapMeeLogo } from "@/components/brand/ChapMeeLogo";

type StudioBrandMarkProps = {
  size?: "sm" | "md";
  linkToRoot?: boolean;
};

export function StudioBrandMark({
  linkToRoot = true,
  size = "md"
}: StudioBrandMarkProps) {
  const logoHeight = size === "sm" ? 24 : 30;
  const content = <ChapMeeLogo height={logoHeight} priority={size === "md"} />;

  if (linkToRoot) {
    return (
      <Link
        aria-label="ChapMee"
        className="inline-flex shrink-0 transition hover:opacity-90"
        href="/"
      >
        {content}
      </Link>
    );
  }

  return content;
}
