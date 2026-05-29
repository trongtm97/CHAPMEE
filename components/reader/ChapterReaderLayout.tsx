import type { ReactNode } from "react";

type ChapterReaderLayoutProps = {
  children: ReactNode;
};

export function ChapterReaderLayout({ children }: ChapterReaderLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-[54rem]">
      <article className="space-y-7">{children}</article>
    </div>
  );
}
