import type { ReactNode } from "react";
import { ContentPostsLayout } from "@/components/content-posts/ContentPostsLayout";
import { ContentPostsMobileMenuProvider } from "@/components/content-posts/ContentPostsMobileMenuProvider";
import { listContentPostCategories } from "@/lib/platform-content/content-post-categories";

export default async function BaiVietLayout({ children }: { children: ReactNode }) {
  const categoriesResult = await listContentPostCategories();

  return (
    <ContentPostsMobileMenuProvider categories={categoriesResult.items}>
      <ContentPostsLayout categories={categoriesResult.items}>{children}</ContentPostsLayout>
    </ContentPostsMobileMenuProvider>
  );
}
