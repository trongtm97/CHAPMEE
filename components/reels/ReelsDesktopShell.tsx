import type { ReactNode } from "react";

type ReelsDesktopShellProps = {
  children: ReactNode;
};

export function ReelsDesktopShell({ children }: ReelsDesktopShellProps) {
  return (
    <div className="hidden min-h-screen bg-[#06090d] text-zinc-50 lg:block">
      <main className="relative min-h-screen">{children}</main>
    </div>
  );
}
