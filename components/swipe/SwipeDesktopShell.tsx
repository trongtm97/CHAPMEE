import type { ReactNode } from "react";

type SwipeDesktopShellProps = {
  children: ReactNode;
};

export function SwipeDesktopShell({ children }: SwipeDesktopShellProps) {
  return (
    <div className="hidden min-h-screen bg-[#06090d] text-zinc-50 lg:block">
      <main className="relative min-h-screen">{children}</main>
    </div>
  );
}
