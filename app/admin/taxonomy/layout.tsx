import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý taxonomy | Admin ChapMee",
  description: "Taxonomy Control Center — thể loại, tag, format và cảnh báo nội dung."
};

export default function AdminTaxonomyLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <section className="max-w-[1440px]">{children}</section>;
}
