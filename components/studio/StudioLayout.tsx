import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { StudioTopbar } from "@/components/studio/StudioTopbar";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import {
  STUDIO_PAGE_WIDTH_CLASS,
  STUDIO_SHELL_MAX_WIDTH_CLASS
} from "@/lib/studio/constants";

type StudioLayoutProps = Readonly<{
  children: React.ReactNode;
  creatorProfile: CreatorProfile;
}>;

export function StudioLayout({ children, creatorProfile }: StudioLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-50">
      <StudioTopbar creatorProfile={creatorProfile} />
      <div
        className={`mx-auto w-full ${STUDIO_SHELL_MAX_WIDTH_CLASS} px-3 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4`}
      >
        <div className="grid gap-2.5 sm:gap-4 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-5">
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(env(safe-area-inset-top)+0.75rem)] rounded-xl border border-white/10 bg-zinc-950/80 p-3 backdrop-blur-xl">
              <StudioSidebar variant="desktop" />
            </div>
          </aside>

          <div className="min-w-0 space-y-2 sm:space-y-3">
            <div className="rounded-xl border border-white/10 bg-zinc-950/80 px-2 py-2 backdrop-blur-xl lg:hidden">
              <StudioSidebar variant="compact" />
            </div>
            <main className={STUDIO_PAGE_WIDTH_CLASS}>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
