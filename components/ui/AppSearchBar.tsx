"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { AppSearchField, APP_SEARCH_PLACEHOLDER } from "@/components/ui/AppSearchField";

type AppSearchBarProps = {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  /** GET form action — dùng khi cần submit server (vd. kèm hidden filter). */
  action?: string;
  hiddenFields?: Record<string, string | undefined>;
  /** Mặc định: chuyển tới /truyen?q=...&page=1 */
  catalogNavigation?: boolean;
  onSearch?: (query: string) => void;
};

export function AppSearchBar({
  action,
  catalogNavigation,
  className = "",
  defaultValue = "",
  hiddenFields = {},
  onSearch,
  placeholder = APP_SEARCH_PLACEHOLDER
}: AppSearchBarProps) {
  const router = useRouter();
  const useCatalogNavigation = catalogNavigation ?? (!action && !onSearch);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (action && !onSearch && !useCatalogNavigation) {
      return;
    }

    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();

    if (onSearch) {
      onSearch(query);
      return;
    }

    if (useCatalogNavigation) {
      if (!query) {
        router.push("/truyen?page=1");
        return;
      }
      router.push(`/truyen?q=${encodeURIComponent(query)}&page=1`);
    }
  }

  return (
    <form action={action} className={className} method={action ? "get" : undefined} onSubmit={handleSubmit}>
      {Object.entries(hiddenFields).map(([fieldName, fieldValue]) =>
        fieldValue ? <input key={fieldName} name={fieldName} type="hidden" value={fieldValue} /> : null
      )}
      <AppSearchField defaultValue={defaultValue} placeholder={placeholder} />
    </form>
  );
}
