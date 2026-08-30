import type { ReactNode } from "react";

type DesktopReaderLayoutProps = {
  leftSidebar: ReactNode;
  centerContent: ReactNode;
  rightSidebar: ReactNode;
};

export function DesktopReaderLayout({
  leftSidebar,
  centerContent,
  rightSidebar
}: DesktopReaderLayoutProps) {
  return (
    <div className="lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)_14rem] lg:items-start lg:gap-4 xl:grid-cols-[13.5rem_minmax(0,1fr)_15rem] xl:gap-5">
      <aside className="hidden lg:sticky lg:top-20 lg:block">{leftSidebar}</aside>
      <div className="min-w-0">{centerContent}</div>
      <aside className="hidden lg:sticky lg:top-20 lg:block">{rightSidebar}</aside>
    </div>
  );
}
