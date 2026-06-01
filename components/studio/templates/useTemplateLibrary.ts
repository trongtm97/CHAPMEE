"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTemplateFavoriteIds,
  getTemplateRecent,
  getTemplateUsageCounts
} from "@/lib/studio/template-preferences";
import { matchesCategoryFilter } from "@/lib/studio/templates-query";
import type {
  StudioTemplateCategoryFilter,
  StudioTemplateListItem,
  StudioTemplateSort,
  StudioTemplateTab,
  StudioTemplatesPageStats
} from "@/types/templates";

type UseTemplateLibraryInput = {
  activeCategory: StudioTemplateCategoryFilter;
  activeTab: StudioTemplateTab;
  allTemplates: StudioTemplateListItem[];
  mineCount: number;
  search: string;
  sort: StudioTemplateSort;
  systemCount: number;
};

export function useTemplateLibrary({
  activeCategory,
  activeTab,
  allTemplates,
  mineCount,
  search,
  sort,
  systemCount
}: UseTemplateLibraryInput) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  const refreshPrefs = useCallback(() => {
    setFavoriteIds(getTemplateFavoriteIds());
    setRecentIds(getTemplateRecent().map((entry) => entry.templateId));
    setUsageCounts(getTemplateUsageCounts());
  }, []);

  useEffect(() => {
    refreshPrefs();
  }, [refreshPrefs]);

  const stats: StudioTemplatesPageStats = useMemo(
    () => ({
      favoriteCount: favoriteIds.length,
      mineCount,
      recentCount: recentIds.length,
      systemCount,
      typeCount: new Set(allTemplates.map((t) => t.templateType)).size
    }),
    [allTemplates, favoriteIds.length, mineCount, recentIds.length, systemCount]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let items = allTemplates.filter((item) => {
      if (activeTab === "system" && !item.isSystem) {
        return false;
      }

      if (activeTab === "mine" && item.isSystem) {
        return false;
      }

      if (activeTab === "favorites" && !favoriteIds.includes(item.id)) {
        return false;
      }

      if (activeTab === "recent" && !recentIds.includes(item.id)) {
        return false;
      }

      if (!matchesCategoryFilter(item, activeCategory)) {
        return false;
      }

      if (q) {
        const haystack = `${item.title} ${item.description ?? ""} ${item.plainText ?? ""}`.toLowerCase();

        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    });

    items = [...items].sort((a, b) => {
      if (sort === "az") {
        return a.title.localeCompare(b.title, "vi");
      }

      if (sort === "used") {
        return (usageCounts[b.id] ?? 0) - (usageCounts[a.id] ?? 0);
      }

      if (sort === "favorite") {
        const af = favoriteIds.includes(a.id) ? 1 : 0;
        const bf = favoriteIds.includes(b.id) ? 1 : 0;

        if (bf !== af) {
          return bf - af;
        }
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    if (sort === "favorite") {
      return items;
    }

    if (activeTab === "recent") {
      return items.sort(
        (a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id)
      );
    }

    return items;
  }, [
    activeCategory,
    activeTab,
    allTemplates,
    favoriteIds,
    recentIds,
    search,
    sort,
    usageCounts
  ]);

  function isFavorite(templateId: string) {
    return favoriteIds.includes(templateId);
  }

  return {
    filtered,
    isFavorite,
    refreshPrefs,
    resultCount: filtered.length,
    stats,
    usageCounts
  };
}
