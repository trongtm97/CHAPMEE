import type { ReactNode } from "react";

type StoryDetailSeoLayoutProps = {
  main: ReactNode;
  sidebar?: ReactNode;
};

export function StoryDetailSeoLayout({ main, sidebar }: StoryDetailSeoLayoutProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="min-w-0">{main}</div>
      {sidebar ? <aside className="space-y-4 lg:sticky lg:top-24">{sidebar}</aside> : null}
    </div>
  );
}
