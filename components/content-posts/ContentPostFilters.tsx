"use client";



import {

  PUBLIC_POST_SORT_OPTIONS,

  buildPublicPostListQuery,

  type PublicPostCategoryFilter,

  type PublicPostSort

} from "@/lib/content-posts/public-catalog";



type ContentPostFiltersProps = {

  category: PublicPostCategoryFilter;

  sort: PublicPostSort;

  query: string;

  page: number;

  onNavigate: (href: string) => void;

};



export function ContentPostFilters({

  category,

  sort,

  query,

  page,

  onNavigate

}: ContentPostFiltersProps) {

  function go(next: {

    page?: number;

    category?: PublicPostCategoryFilter;

    sort?: PublicPostSort;

  }) {

    const href = `/bai-viet${buildPublicPostListQuery({

      page: next.page ?? page,

      q: query,

      category: next.category ?? category,

      sort: next.sort ?? sort

    })}`;

    onNavigate(href);

  }



  return (

    <div className="flex flex-wrap items-center gap-2">

      <span className="text-xs font-medium text-zinc-500">Sắp xếp</span>

      <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Sắp xếp bài viết">

        {PUBLIC_POST_SORT_OPTIONS.map((option) => {

          const active = sort === option.value;

          return (

            <button

              aria-pressed={active}

              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${

                active

                  ? "bg-white/10 text-zinc-100"

                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"

              }`}

              key={option.value}

              onClick={() => go({ sort: option.value, page: 1 })}

              type="button"

            >

              {option.label}

            </button>

          );

        })}

      </div>

    </div>

  );

}


