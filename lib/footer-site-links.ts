import {
  FOOTER_MOBILE_LINK_HREFS,
  getFooterMobileSiteLinks,
  getFooterSiteLinks
} from "@/lib/config/site-links";
import type { FooterConfig } from "@/lib/settings/footer-config";

export { FOOTER_MOBILE_LINK_HREFS };

export const FOOTER_BRAND_DESCRIPTION =
  "Nơi bạn lướt, đọc và khám phá những câu chuyện giải trí theo cách mới";

/** Desktop/tablet: link gọn theo cấu hình tập trung. */
export const FOOTER_QUICK_LINKS = getFooterSiteLinks();

/** Mobile footer: chỉ link thao tác thường dùng. */
export const FOOTER_MOBILE_QUICK_LINKS = getFooterMobileSiteLinks();

export type FooterSupportEmail = {
  label: string;
  value: string;
  href: string;
};

export function getFooterSupportEmails(
  contact: FooterConfig["officialContact"]
): FooterSupportEmail[] {
  const rows: Array<{ label: string; key: keyof FooterConfig["officialContact"] }> = [
    { label: "Hỗ trợ", key: "supportEmail" },
    { label: "Bản quyền", key: "copyrightEmail" },
    { label: "Kinh doanh", key: "businessEmail" }
  ];

  return rows
    .map(({ label, key }) => {
      const value = (contact[key] ?? "").trim();
      if (!value || !value.includes("@")) return null;
      return { label, value, href: `mailto:${value}` };
    })
    .filter((row): row is FooterSupportEmail => row !== null);
}
