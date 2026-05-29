import type { ReactNode } from "react";

type AuthorProfileSeoProps = {
  header: ReactNode;
  body: ReactNode;
};

export function AuthorProfileSeo({ header, body }: AuthorProfileSeoProps) {
  return (
    <div className="space-y-6">
      {header}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">{body}</div>
        <aside className="hidden space-y-3 rounded-2xl border border-white/10 bg-[var(--surface)] p-4 text-sm text-zinc-300 lg:block">
          <p className="font-semibold text-white">Khám phá thêm</p>
          <a className="block hover:text-cyan-200" href="/bang-xep-hang">Bảng xếp hạng</a>
          <a className="block hover:text-cyan-200" href="/discover">Khám phá truyện</a>
          <a className="block hover:text-cyan-200" href="/community">Cộng đồng</a>
        </aside>
      </div>
    </div>
  );
}
