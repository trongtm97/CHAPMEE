import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { LoveShareView } from "@/components/utilities/love-insight/LoveShareView";

import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";

import { getPublicShareReading } from "@/lib/love-insight/db/loveReadings";

import { buildOgUrl } from "@/lib/love-insight/api/helpers";

import { getLoveInsightSiteUrl } from "@/lib/love-insight/site-constants";

import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";



type PageProps = {

  params: Promise<{ shareId: string }>;

};



function truncate(text: string, max: number): string {

  const t = (text ?? "").trim();

  if (t.length <= max) return t;

  const cut = t.slice(0, max);

  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;

}



export async function generateMetadata({ params }: PageProps): Promise<Metadata> {

  const { shareId } = await params;

  const pub = shareId?.trim() ? await getPublicShareReading(shareId.trim()) : null;



  if (!pub) {

    return metadataForStaticRoute({

      path: `/tien-ich/boi-tinh-yeu/chia-se/${shareId}`,

      pageType: "static",

      fallbackTitle: "Chia sẻ kết quả bói tình yêu | ChapMee",

      fallbackDescription: "Không tìm thấy kết quả chia sẻ.",

      indexableOverride: false,

      followOverride: false

    });

  }



  const title = `${pub.displayPair} — ${pub.totalScore}/100`;

  const description = truncate(`${pub.levelLabel}. ${pub.summary}`, 180);

  const ogImage = buildOgUrl(pub.shareId);

  const pageUrl = `${getLoveInsightSiteUrl()}/tien-ich/boi-tinh-yeu/chia-se/${pub.shareId}`;



  const base = await metadataForStaticRoute({

    path: `/tien-ich/boi-tinh-yeu/chia-se/${shareId}`,

    pageType: "static",

    fallbackTitle: title,

    fallbackDescription: description,

    indexableOverride: false,

    followOverride: false

  });



  return {

    ...base,

    title,

    description,

    openGraph: {

      title,

      description,

      url: pageUrl,

      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],

      locale: "vi_VN",

      type: "article"

    },

    twitter: {

      card: "summary_large_image",

      title,

      description,

      images: [ogImage]

    }

  };

}



export default async function LoveReadingSharePage({ params }: PageProps) {

  const { shareId } = await params;

  if (!shareId?.trim()) notFound();



  const pub = await getPublicShareReading(shareId.trim());

  if (!pub) notFound();



  return (

    <UtilitiesToolShell>

      <LoveShareView pub={pub} />

    </UtilitiesToolShell>

  );

}

