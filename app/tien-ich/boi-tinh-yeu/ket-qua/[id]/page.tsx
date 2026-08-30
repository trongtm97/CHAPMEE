import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoveResultView } from "@/components/utilities/love-insight/LoveResultView";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { getLoveReadingById, rowToResult } from "@/lib/love-insight/db/loveReadings";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return metadataForStaticRoute({
    path: `/tien-ich/boi-tinh-yeu/ket-qua/${id}`,
    pageType: "static",
    fallbackTitle: "Kết quả bói tình yêu | ChapMee",
    fallbackDescription: "Xem mức độ hợp nhau và phân tích chi tiết tình yêu theo tên và ngày sinh.",
    indexableOverride: false,
    followOverride: true
  });
}

export default async function LoveReadingResultPage({ params }: PageProps) {
  const { id } = await params;
  if (!id?.trim()) notFound();

  const row = await getLoveReadingById(id.trim());
  if (!row) notFound();

  const result = {
    id: row.id,
    shareId: row.shareId,
    ...rowToResult(row)
  };

  return (
    <UtilitiesToolShell>
      <LoveResultView result={result} />
    </UtilitiesToolShell>
  );
}
