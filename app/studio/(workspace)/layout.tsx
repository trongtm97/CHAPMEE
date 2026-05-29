import type { Metadata } from "next";
import { ErrorState } from "@/components/ui";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { STUDIO_NOINDEX_ROBOTS } from "@/lib/seo/should-index";

export const metadata: Metadata = {
  robots: STUDIO_NOINDEX_ROBOTS
};

export const dynamic = "force-dynamic";

export default async function StudioWorkspaceLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { creatorProfile, error } = await getStudioAccess("/studio");

  if (error || !creatorProfile) {
    return (
      <div className="min-h-screen bg-[#0b0c10] px-4 py-10 text-zinc-50">
        <div className="mx-auto w-full max-w-4xl">
          <ErrorState message={error} title="Không tải được Studio" />
        </div>
      </div>
    );
  }

  return <StudioLayout creatorProfile={creatorProfile}>{children}</StudioLayout>;
}
