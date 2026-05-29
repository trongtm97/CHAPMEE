import type { ReactNode } from "react";

type DesktopSwipeLayoutProps = {
  centerCardWidth: number;
  centerContent: ReactNode;
  leftContent: ReactNode;
  rightContent: ReactNode;
  showLeftPanel: boolean;
  showRightPanel: boolean;
};

export function DesktopSwipeLayout({
  centerCardWidth,
  centerContent,
  leftContent,
  rightContent,
  showLeftPanel,
  showRightPanel
}: DesktopSwipeLayoutProps) {
  return (
    <div className="hidden h-full min-h-0 gap-4 px-4 py-4 lg:grid lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)_minmax(18rem,24rem)] xl:gap-5">
      {showLeftPanel ? (
        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#0e141d]/90 p-4">
          {leftContent}
        </aside>
      ) : (
        <div />
      )}
      <section className="min-h-0">
        <div className="mx-auto h-full min-h-0" style={{ maxWidth: `${centerCardWidth}px` }}>
          {centerContent}
        </div>
      </section>
      {showRightPanel ? (
        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#0e141d]/90 p-4">
          {rightContent}
        </aside>
      ) : (
        <div />
      )}
    </div>
  );
}
