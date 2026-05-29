import type { ReactNode } from "react";

type DesktopRightRailProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function DesktopRightRail({
  title,
  children,
  className = ""
}: DesktopRightRailProps) {
  return (
    <aside
      className={`hidden space-y-3 rounded-2xl border border-white/10 bg-[#101722]/80 p-4 lg:block ${className}`.trim()}
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{title}</p>
      {children}
    </aside>
  );
}
