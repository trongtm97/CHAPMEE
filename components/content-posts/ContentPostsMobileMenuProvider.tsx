"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ContentPostCategory } from "@/types/platform-content";

const ContentPostsCategoriesContext = createContext<ContentPostCategory[]>([]);

export function ContentPostsMobileMenuProvider({
  categories,
  children
}: {
  categories: ContentPostCategory[];
  children: ReactNode;
}) {
  return (
    <ContentPostsCategoriesContext.Provider value={categories}>
      {children}
    </ContentPostsCategoriesContext.Provider>
  );
}

export function useContentPostsCategories() {
  return useContext(ContentPostsCategoriesContext);
}
