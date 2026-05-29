"use client";



import { useRouter } from "next/navigation";

import { buildCatalogHref } from "@/lib/stories/catalog-url";

import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";



type StorySortControlProps = {

  currentSort: StoryCatalogSort;

  query: string;

  genre: string;

  status: StoryCatalogStatus;

  className?: string;

  hideLabel?: boolean;

};



const options: Array<{ value: StoryCatalogSort; label: string }> = [

  { value: "updated", label: "Mới cập nhật" },

  { value: "hot", label: "Đang hot" },

  { value: "new", label: "Mới đăng" },

  { value: "reads", label: "Nhiều lượt đọc" },

  { value: "completed", label: "Hoàn thành" }

];



export function StorySortControl({

  className = "",

  currentSort,

  genre,

  hideLabel = false,

  query,

  status

}: StorySortControlProps) {

  const router = useRouter();



  return (

    <label

      className={`inline-flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-zinc-400 ${className}`.trim()}

    >

      {hideLabel ? null : <span className="shrink-0">Sắp xếp</span>}

      <select

        className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[var(--surface)] px-2 text-xs text-zinc-100 outline-none focus:border-cyan-300/50 lg:h-10 lg:px-2.5 lg:text-sm"

        name="sort"

        onChange={(event) => {

          const nextSort = event.target.value as StoryCatalogSort;

          router.push(

            buildCatalogHref({

              q: query,

              genre,

              status,

              sort: nextSort

            })

          );

        }}

        value={currentSort}

      >

        {options.map((option) => (

          <option key={option.value} value={option.value}>

            {option.label}

          </option>

        ))}

      </select>

    </label>

  );

}


