import type { ReactNode } from "react";
import { UtilityViewTracker } from "@/components/analytics/UtilityViewTracker";
import { UtilitiesSidebar } from "@/components/utilities/UtilitiesSidebar";
import {
  UTILITIES_PAGE_WIDTH_CLASS,
  UTILITIES_SHELL_MAX_WIDTH_CLASS
} from "@/lib/utilities/constants";

type UtilitiesLayoutProps = Readonly<{
  children: ReactNode;
}>;

export function UtilitiesLayout({ children }: UtilitiesLayoutProps) {
  return (
    <>
      <UtilityViewTracker />
      <div
      className={`mx-auto w-full ${UTILITIES_SHELL_MAX_WIDTH_CLASS} -mx-1 px-0 sm:px-0 lg:mx-auto lg:px-0`}
    >
      <div className="grid gap-2.5 sm:gap-4 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-4">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(env(safe-area-inset-top)+3.25rem)] rounded-lg border border-white/[0.06] bg-[#0b1016]/80 p-2 backdrop-blur-xl">
            <UtilitiesSidebar variant="desktop" />
          </div>
        </aside>

        <main className={`${UTILITIES_PAGE_WIDTH_CLASS} min-w-0`}>{children}</main>
      </div>
    </div>
    </>
  );
}