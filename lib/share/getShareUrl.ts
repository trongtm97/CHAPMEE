import { buildCanonicalUrl } from "@/lib/seo/metadata";

export function getShareUrl(pathname: string) {
  return buildCanonicalUrl(pathname) ?? pathname;
}
