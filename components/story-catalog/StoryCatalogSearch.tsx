"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildCatalogViewHref, type CatalogViewState } from "@/lib/stories/story-filters";

type StoryCatalogSearchProps = CatalogViewState;

export function StoryCatalogSearch({ filters, genre, query, sort, status }: StoryCatalogSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(
      buildCatalogViewHref(
        { filters, genre, query, sort, status },
        { q: value.trim() || undefined, page: 1 }
      )
    );
  }

  return (
    <form className="w-full" onSubmit={onSubmit}>
      <AppSearchField
        inputClassName="md:h-12"
        onChange={setValue}
        placeholder="Tìm truyện, tác giả, thể loại, tag..."
        value={value}
        variant="discover"
      />
    </form>
  );
}
