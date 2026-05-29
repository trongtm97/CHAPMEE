import type { ReactNode } from "react";

type MobileSwipeLayoutProps = {
  children: ReactNode;
};

export function MobileSwipeLayout({ children }: MobileSwipeLayoutProps) {
  return <div className="relative h-full min-h-0 overflow-hidden lg:hidden">{children}</div>;
}
