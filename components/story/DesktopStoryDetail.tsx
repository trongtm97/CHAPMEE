import type { ReactNode } from "react";

type DesktopStoryDetailProps = {
  mainContent: ReactNode;
  rightPanel?: ReactNode | null;
};

export function DesktopStoryDetail({ mainContent, rightPanel }: DesktopStoryDetailProps) {
  if (!rightPanel) {
    return <div className="min-w-0">{mainContent}</div>;
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8">
      <div className="min-w-0">{mainContent}</div>
      <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block">{rightPanel}</aside>
    </div>
  );
}
