"use client";

import { type FormEvent, useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";

type CatalogSearchBarProps = {
  placeholder: string;
  query: string;
  onSubmit: (query: string) => void;
  pending?: boolean;
};

export function CatalogSearchBar({ placeholder, query, onSubmit, pending }: CatalogSearchBarProps) {
  const [value, setValue] = useState(query);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value.trim());
  }

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="catalog-search">
        Tìm kiếm
      </label>
      <AppSearchField
        className="w-full"
        inputClassName="h-10 md:h-11"
        onChange={setValue}
        placeholder={placeholder}
        submitAriaLabel="Tìm kiếm"
        value={value}
        variant="discover"
      />
      {pending ? (
        <p aria-live="polite" className="sr-only">
          Đang tìm…
        </p>
      ) : null}
    </form>
  );
}
