import Link from "next/link";
import type { ReactNode } from "react";
import { ContentPostCard } from "@/components/content-posts/ContentPostCard";
import { CONTENT_HUB_TOPIC_LINKS } from "@/lib/content-posts/public-catalog";
import type { AdminContentPost } from "@/types/platform-content";

type ContentPostHubSidebarProps = {
  popular: AdminContentPost[];
  recent: AdminContentPost[];
  forAuthors: AdminContentPost[];
  forReaders: AdminContentPost[];
};

function SidebarBlock({
  title,
  children,
  id
}: {
  title: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ContentPostHubSidebar({
  popular,
  recent,
  forAuthors,
  forReaders
}: ContentPostHubSidebarProps) {
  return (
    <aside className="space-y-8">
      <SidebarBlock id="hub-topics" title="Chủ đề nổi bật">
        <ul className="space-y-2">
          {CONTENT_HUB_TOPIC_LINKS.map((topic) => (
            <li key={topic.href}>
              <Link
                className="block rounded-lg border border-white/8 px-3 py-2 text-sm transition hover:border-cyan-300/25 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                href={topic.href}
              >
                <span className="font-medium text-zinc-200">{topic.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </SidebarBlock>

      {popular.length > 0 ? (
        <SidebarBlock id="hub-popular" title="Bài được quan tâm">
          <ul className="space-y-2">
            {popular.map((item) => (
              <li key={item.id}>
                <ContentPostCard compact item={item} />
              </li>
            ))}
          </ul>
        </SidebarBlock>
      ) : null}

      {forAuthors.length > 0 ? (
        <SidebarBlock id="hub-authors" title="Dành cho tác giả">
          <p className="text-xs text-zinc-500">
            <Link className="text-cyan-300/90 hover:text-cyan-200" href="/studio/setup">
              Mở Studio
            </Link>{" "}
            để bắt đầu xuất bản.
          </p>
          <ul className="space-y-2">
            {forAuthors.map((item) => (
              <li key={item.id}>
                <ContentPostCard compact item={item} />
              </li>
            ))}
          </ul>
        </SidebarBlock>
      ) : null}

      {forReaders.length > 0 ? (
        <SidebarBlock id="hub-readers" title="Dành cho người đọc">
          <ul className="space-y-2">
            {forReaders.map((item) => (
              <li key={item.id}>
                <ContentPostCard compact item={item} />
              </li>
            ))}
          </ul>
        </SidebarBlock>
      ) : null}

      {recent.length > 0 ? (
        <SidebarBlock id="hub-recent" title="Bài mới">
          <ul className="space-y-2">
            {recent.slice(0, 4).map((item) => (
              <li key={item.id}>
                <ContentPostCard compact item={item} />
              </li>
            ))}
          </ul>
        </SidebarBlock>
      ) : null}
    </aside>
  );
}

export function ContentPostHubMobileSections({
  popular,
  forAuthors,
  forReaders
}: ContentPostHubSidebarProps) {
  return (
    <div className="space-y-6 xl:hidden">
      <section aria-labelledby="mobile-hub-topics" className="space-y-3">
        <h2 id="mobile-hub-topics" className="text-sm font-bold text-zinc-300">
          Chủ đề gợi ý
        </h2>
        <nav
          aria-label="Chủ đề nhanh"
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"
        >
          {CONTENT_HUB_TOPIC_LINKS.map((topic) => (
            <Link
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
              href={topic.href}
              key={topic.href}
            >
              {topic.label}
            </Link>
          ))}
        </nav>
      </section>

      {popular.length > 0 ? (
        <section aria-labelledby="mobile-hub-popular" className="space-y-3">
          <h2 id="mobile-hub-popular" className="text-sm font-bold text-zinc-300">
            Bài được quan tâm
          </h2>
          <ul className="space-y-2">
            {popular.slice(0, 3).map((item) => (
              <li key={item.id}>
                <ContentPostCard compact item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(forAuthors.length > 0 || forReaders.length > 0) && (
        <section aria-labelledby="mobile-hub-audience" className="space-y-3">
          <h2 id="mobile-hub-audience" className="text-sm font-bold text-zinc-300">
            Dành cho bạn
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              ...new Map(
                [...forAuthors.slice(0, 2), ...forReaders.slice(0, 2)].map((item) => [
                  item.id,
                  item
                ])
              ).values()
            ].map((item) => (
              <li key={item.id}>
                <ContentPostCard compact item={item} layout="grid" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
