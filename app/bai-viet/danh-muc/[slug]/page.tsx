import type { Metadata } from "next";

import Link from "next/link";

import { notFound } from "next/navigation";



import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";

import { ContentPostCard } from "@/components/content-posts/ContentPostCard";

import { ContentPostEmptyState } from "@/components/content-posts/ContentPostEmptyState";

import { listPublicPostsByCategorySlug } from "@/lib/platform-content/content-post-categories";

import { PUBLIC_CONTENT_HUB_PAGE_SIZE } from "@/lib/content-posts/public-catalog";

import { resolveStoredMediaUrl } from "@/lib/media/media-resolver";

import { resolveMediaAssetPublicUrl } from "@/lib/seo/seo-media";



type PageProps = {

  params: Promise<{ slug: string }>;

  searchParams: Promise<Record<string, string | string[] | undefined>>;

};



function parseString(param: string | string[] | undefined) {

  return String(Array.isArray(param) ? param[0] : param ?? "").trim();

}



function parsePage(param: string | string[] | undefined) {

  const raw = Number(parseString(param) || "1");

  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;

}



function parseSort(param: string | string[] | undefined): "published" | "views" | "updated" {

  const raw = parseString(param);

  if (raw === "views" || raw === "updated" || raw === "published") return raw;

  return "published";

}



async function resolveCategoryOgImage(input: {

  og_image_media_asset_id?: string | null;

  og_image_url?: string | null;

  cover_media_asset_id?: string | null;

  cover_image_url?: string | null;

}) {

  const assetId = input.og_image_media_asset_id || input.cover_media_asset_id;

  if (assetId) {

    const fromAsset = await resolveMediaAssetPublicUrl(assetId);

    if (fromAsset) return fromAsset;

  }

  return resolveStoredMediaUrl(input.og_image_url || input.cover_image_url || null);

}



export default async function ContentPostCategoryPublicPage({ params, searchParams }: PageProps) {

  const { slug } = await params;

  const query = await searchParams;

  const page = parsePage(query.page);

  const q = parseString(query.q);

  const sort = parseSort(query.sort);



  const { category, items, total, error } = await listPublicPostsByCategorySlug({

    slug,

    page,

    pageSize: PUBLIC_CONTENT_HUB_PAGE_SIZE,

    q,

    sort

  });



  if (!category) {

    notFound();

  }



  const totalPages = Math.max(1, Math.ceil(total / PUBLIC_CONTENT_HUB_PAGE_SIZE));



  return (

    <ResponsivePageContainer className="py-6 md:py-8">

      <div className="space-y-5 md:space-y-6">

        <header className="space-y-2">

          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Chuyên mục</p>

          <h1 className="text-2xl font-bold text-white md:text-3xl">{category.name}</h1>

          {category.description?.trim() ? (

            <p className="max-w-3xl text-sm text-zinc-300">{category.description}</p>

          ) : null}

        </header>



        {error ? (

          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">

            Không thể tải danh sách bài viết. Vui lòng thử lại sau.

          </p>

        ) : items.length === 0 ? (

          <ContentPostEmptyState hasActiveFilters={Boolean(q)} showSuggestedTopics={false} variant="no-results" />

        ) : (

          <section className="space-y-4">

            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

              {items.map((item) => (

                <li key={item.id}>

                  <ContentPostCard item={item} layout="grid" />

                </li>

              ))}

            </ul>



            {totalPages > 1 ? (

              <div className="flex flex-wrap items-center gap-2">

                {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {

                  const p = i + 1;

                  const active = p === page;

                  const params = new URLSearchParams();

                  if (q) params.set("q", q);

                  if (sort !== "published") params.set("sort", sort);

                  if (p > 1) params.set("page", String(p));

                  const href = params.toString()

                    ? `/bai-viet/danh-muc/${category.slug}?${params.toString()}`

                    : `/bai-viet/danh-muc/${category.slug}`;

                  return (

                    <Link

                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${

                        active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"

                      }`}

                      href={href}

                      key={p}

                    >

                      {p}

                    </Link>

                  );

                })}

              </div>

            ) : null}

          </section>

        )}

      </div>

    </ResponsivePageContainer>

  );

}



export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {

  const { slug } = await params;

  const { item } = await (await import("@/lib/platform-content/content-post-categories")).getContentPostCategoryBySlug(slug, {

    publicOnly: true

  });



  if (!item) {

    return { title: "Chuyên mục không tồn tại" };

  }



  const canonicalPath = item.canonical_url?.trim() || `/bai-viet/danh-muc/${item.slug}`;

  const ogImage = await resolveCategoryOgImage(item);

  const title = item.seo_title?.trim() || `${item.name} | Bài viết ChapMee`;

  const description =

    item.seo_description?.trim() ||

    item.description?.trim() ||

    `Tổng hợp bài viết thuộc chuyên mục ${item.name} trên ChapMee.`;



  const noindex = item.indexable ? false : true;

  const follow = item.robots.includes("follow");



  return {

    title,

    description,

    alternates: { canonical: canonicalPath },

    robots: {

      index: !noindex,

      follow

    },

    openGraph: {

      type: "website",

      title,

      description,

      url: canonicalPath,

      images: ogImage ? [{ url: ogImage }] : undefined

    },

    twitter: ogImage ? { card: "summary_large_image", images: [ogImage] } : undefined

  };

}


