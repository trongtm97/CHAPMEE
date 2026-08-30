import type { ReactNode } from "react";
import { ContentPostsSidebar } from "@/components/content-posts/ContentPostsSidebar";
import type { ContentPostCategory } from "@/types/platform-content";

type ContentPostsLayoutProps = {
  categories: ContentPostCategory[];
  children: ReactNode;
};

export function ContentPostsLayout({ categories, children }: ContentPostsLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-7xl -mx-1 px-0 sm:px-0 lg:mx-auto lg:px-0">
      <div className="grid gap-2.5 sm:gap-4 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-4">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(env(safe-area-inset-top)+3.25rem)] rounded-lg border border-white/[0.06] bg-[#0b1016]/80 p-2 backdrop-blur-xl">
            <ContentPostsSidebar categories={categories} variant="desktop" />
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
