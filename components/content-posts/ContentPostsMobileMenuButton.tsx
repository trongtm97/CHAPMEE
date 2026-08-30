"use client";

import { ContentPostsMobileHeaderMenu } from "@/components/content-posts/ContentPostsSidebar";
import { useContentPostsCategories } from "@/components/content-posts/ContentPostsMobileMenuProvider";

export function ContentPostsMobileMenuButton() {
  const categories = useContentPostsCategories();
  return <ContentPostsMobileHeaderMenu categories={categories} />;
}
