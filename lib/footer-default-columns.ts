import {
  FOOTER_QUICK_LINKS
} from "@/lib/footer-site-links";
import type { FooterColumn, FooterLink } from "@/lib/settings/footer-config";

function footerLink(label: string, href: string, sortOrder: number): FooterLink {
  return { label, href, external: false, enabled: true, sortOrder };
}

function footerColumn(title: string, sortOrder: number, links: FooterLink[]): FooterColumn {
  return { title, enabled: true, sortOrder, links };
}

/** Footer gọn: chỉ cột liên kết nhanh (brand + email render riêng trong FooterView). */
export function getDefaultFooterColumns(): FooterColumn[] {
  return [
    footerColumn(
      "Liên kết nhanh",
      0,
      FOOTER_QUICK_LINKS.map((link, index) =>
        footerLink(link.label, link.href, index)
      )
    )
  ];
}

export function isLegacyFooterColumns(columns: FooterColumn[]): boolean {
  if (columns.length === 0) return true;

  return (
    columns.length > 1 ||
    columns.some(
      (column) =>
        column.title.includes("Giao dịch") ||
        column.title.includes("Tác giả") ||
        column.title === "Pháp lý" ||
        column.title === "ChapMee" ||
        column.links.length > FOOTER_QUICK_LINKS.length
    )
  );
}
