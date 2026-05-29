import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { StudioTopbar } from "@/components/studio/StudioTopbar";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

type StudioLayoutProps = Readonly<{
  children: React.ReactNode;
  creatorProfile: CreatorProfile;
}>;

export function StudioLayout({ children, creatorProfile }: StudioLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-50">
      <StudioTopbar creatorProfile={creatorProfile} />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(env(safe-area-inset-top)+5.75rem)] rounded-2xl border border-white/10 bg-zinc-950/80 p-3 backdrop-blur-xl">
              <StudioSidebar variant="desktop" />
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="lg:hidden rounded-2xl border border-white/10 bg-zinc-950/80 px-3 py-3 backdrop-blur-xl">
              <StudioSidebar variant="compact" />
            </div>
            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
