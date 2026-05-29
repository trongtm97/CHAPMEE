import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildCanonicalUrl, getDefaultOgImage } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "ChapChat chapter preview",
    description: "Đọc thử chapter trên ChapMee.",
    robots: { index: false, follow: false },
    alternates: { canonical: buildCanonicalUrl("/swipe") },
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
