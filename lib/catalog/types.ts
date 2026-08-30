import type { ReactNode } from "react";

export type CatalogSortOption = {
  id: string;
  label: string;
};

export type CatalogQuickFilterDef = {
  id: string;
  label: string;
  /** Patch applied when chip is clicked (page reset to 1). */
  patch: Record<string, unknown>;
};

export type CatalogAdvancedFieldDef = {
  id: string;
  label: string;
  paramKey: string;
  placeholder?: string;
};

export type CatalogActiveChip = {
  key: string;
  label: string;
  clearHref: string;
};

/** Static labels/options — no href builders (those live in runtime). */
export type CatalogFilterShellConfig = {
  id: "story" | "media";
  searchPlaceholder: string;
  sortOptions: CatalogSortOption[];
  quickFilters: CatalogQuickFilterDef[];
  advancedFields?: CatalogAdvancedFieldDef[];
  defaultSort: string;
};

export type CatalogFilterShellRuntime = {
  query: string;
  sort: string;
  buildHref: (patch: Record<string, unknown>) => string;
  isQuickFilterActive: (chipId: string, def: CatalogQuickFilterDef) => boolean;
  activeChips: CatalogActiveChip[];
  clearAllHref: string;
  hasActiveFilters: boolean;
};

export type CatalogSearchFilterShellProps = {
  config: CatalogFilterShellConfig;
  runtime: CatalogFilterShellRuntime;
  advancedSlot?: ReactNode;
  mobileAdvancedSlot?: ReactNode;
  sortVariant?: "chips" | "select";
  pending?: boolean;
  compact?: boolean;
};

export type CatalogEmptyStateConfig = {
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  filterDescription?: string;
};
