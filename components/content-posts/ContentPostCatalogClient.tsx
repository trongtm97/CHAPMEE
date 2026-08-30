"use client";



import { useRouter } from "next/navigation";

import { useState } from "react";

import { ContentPostCard } from "@/components/content-posts/ContentPostCard";

import { ContentPostEmptyState } from "@/components/content-posts/ContentPostEmptyState";

import { ContentPostFilters } from "@/components/content-posts/ContentPostFilters";

import { ContentPostPagination } from "@/components/content-posts/ContentPostPagination";

import { FeaturedArticlesSection } from "@/components/content-posts/FeaturedArticlesSection";

import type { PublicPostCategoryFilter, PublicPostSort } from "@/lib/content-posts/public-catalog";

import type { AdminContentPost, ContentPostCategory } from "@/types/platform-content";



type Props = {

  items: AdminContentPost[];

  total: number;

  page: number;

  pageSize: number;

  query: string;

  category: PublicPostCategoryFilter;

  sort: PublicPostSort;

  dynamicCategories?: ContentPostCategory[];

  featuredPrimary: AdminContentPost | null;

  featuredSecondary: AdminContentPost[];

  showUpdatingEmpty?: boolean;

  hasActiveFilters?: boolean;

};



export function ContentPostCatalogClient({

  items,

  total,

  page,

  pageSize,

  query,

  category,

  sort,

  featuredPrimary,

  featuredSecondary,

  showUpdatingEmpty = false,

  hasActiveFilters = false

}: Props) {

  const router = useRouter();

  const [searchInput, setSearchInput] = useState(query);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));



  function navigate(href: string) {

    router.push(href);

  }



  function submitSearch(event: React.FormEvent) {

    event.preventDefault();

    const params = new URLSearchParams();

    const q = searchInput.trim();

    if (q) params.set("q", q);

    if (category !== "all") params.set("category", category);

    if (sort !== "published") params.set("sort", sort);

    const qs = params.toString();

    navigate(qs ? `/bai-viet?${qs}` : "/bai-viet");

  }



  const showFeatured = page === 1 && !query && category === "all" && featuredPrimary;



  return (

    <div className="space-y-5 md:space-y-6">

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submitSearch}>

        <label className="sr-only" htmlFor="content-hub-search">

          Tìm bài viết

        </label>

        <input

          aria-label="Tìm hướng dẫn, mẹo đọc truyện, cập nhật"

          className="min-w-0 flex-1 rounded-xl border border-white/12 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:border-cyan-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-cyan-400/40"

          id="content-hub-search"

          onChange={(event) => setSearchInput(event.target.value)}

          placeholder="Tìm hướng dẫn, mẹo đọc truyện, cập nhật..."

          type="search"

          value={searchInput}

        />

        <button

          className="shrink-0 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"

          type="submit"

        >

          Tìm kiếm

        </button>

      </form>



      <ContentPostFilters category={category} onNavigate={navigate} page={page} query={query} sort={sort} />



      {showFeatured ? (

        <FeaturedArticlesSection primary={featuredPrimary} secondary={featuredSecondary} />

      ) : null}



      <section aria-labelledby="all-posts-heading" className="space-y-3">

        <h2 id="all-posts-heading" className="text-sm font-bold text-zinc-300">

          {hasActiveFilters ? "Kết quả" : "Tất cả bài viết"}

        </h2>



        {items.length === 0 ? (

          <ContentPostEmptyState

            hasActiveFilters={hasActiveFilters}

            showSuggestedTopics

            variant={showUpdatingEmpty ? "updating" : "no-results"}

          />

        ) : (

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

            {items.map((item) => (

              <li key={item.id}>

                <ContentPostCard item={item} layout="grid" />

              </li>

            ))}

          </ul>

        )}

      </section>



      <ContentPostPagination

        category={category}

        page={page}

        query={query}

        sort={sort}

        totalPages={totalPages}

      />

    </div>

  );

}


