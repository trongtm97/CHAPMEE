import type { ReactNode } from "react";

export type ReelsShellProps = {
  children: ReactNode;
};

export function ReelsShell({ children }: ReelsShellProps) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#06090d]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(251,113,133,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_16%,transparent_72%,rgba(0,0,0,0.3))]"
      />
      <div className="relative flex h-full min-h-0 flex-col">{children}</div>
    </section>
  );
}
