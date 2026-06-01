import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildCanonicalUrl, getDefaultOgImage } from "@/lib/seo/metadata";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "ChapChat chapter preview",
    description: "Đọc thử chapter trên ChapMee.",
    robots: { index: false, follow: false },
    alternates: { canonical: buildCanonicalUrl(REELS_PUBLIC_PATH) },
    openGraph: {
      title: "ChapChat chapter preview",
      description: "Đọc thử chapter trên ChapMee.",
      images: [{ url: getDefaultOgImage(), alt: "ChapMee" }]
    },
    twitter: {
      card: "summary_large_image",
      title: "ChapChat chapter preview",
      description: "Đọc thử chapter trên ChapMee.",
      images: [getDefaultOgImage()]
    }
  };
}

export default function ChapterPage() {
  notFound();
}
