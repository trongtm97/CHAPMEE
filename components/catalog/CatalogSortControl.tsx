"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { CatalogSortOption } from "@/lib/catalog/types";

type CatalogSortControlProps = {
  options: CatalogSortOption[];
  sort: string;
  variant?: "chips" | "select";
  buildSortHref: (sortId: string) => string;
  className?: string;
  onNavigate?: (href: string) => void;
};

export function CatalogSortControl({
  options,
  sort,
  variant = "chips",
  buildSortHref,
  className = "",
  onNavigate
}: CatalogSortControlProps) {
  const router = useRouter();
  const [, startNavigation] = useTransition();
  const safeSort = options.some((o) => o.id === sort) ? sort : (options[0]?.id ?? sort);

  function navigate(href: string) {
    if (onNavigate) {
      onNavigate(href);
      return;
    }
    startNavigation(() => {
      router.push(href);
    });
  }

  if (variant === "select") {
    return (
      <label className={`inline-flex min-w-0 items-center gap-2 ${className}`.trim()}>
        <span className="shrink-0 text-[11px] font-medium text-zinc-500">Sắp xếp</span>
        <select
          className="h-9 min-w-[9.5rem] max-w-full rounded-lg border border-white/10 bg-[var(--surface)] px-2.5 text-xs text-zinc-100 outline-none focus:border-cyan-300/50 md:h-10 md:text-sm"
          onChange={(event) => navigate(buildSortHref(event.target.value))}
          value={safeSort}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className={`no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 ${className}`.trim()}>
      {options.map((option) => {
        const active = safeSort === option.id;
        return (
          <Link
            className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold sm:text-xs ${
              active
                ? "bg-cyan-300/15 text-cyan-100 ring-1 ring-cyan-300/25"
                : "border border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
            href={buildSortHref(option.id)}
            key={option.id}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
