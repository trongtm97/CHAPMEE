import type { ReactNode } from "react";

type MobileReelsLayoutProps = {
  children: ReactNode;
};

export function MobileReelsLayout({ children }: MobileReelsLayoutProps) {
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden lg:hidden">{children}</div>
  );
}
