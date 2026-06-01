import type { Metadata } from "next";
import Link from "next/link";
import { StudioHelpPage } from "@/components/studio/StudioHelpPage";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { STUDIO_HELP_PAGE } from "@/lib/content/studio-help";
import { getStudioHelpPageData } from "@/lib/studio/get-studio-help-page-data";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { studioPath } from "@/lib/studio/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${STUDIO_HELP_PAGE.title} — ChapMee Studio`,
    description: STUDIO_HELP_PAGE.subtitle,
    alternates: { canonical: buildCanonicalUrl(studioPath("/help")) }
  };
}

export default async function StudioHelpRoute() {
  const [{ user }, access, helpData] = await Promise.all([
    getCurrentUser(),
    getStudioAccess(studioPath("/help")),
    getStudioHelpPageData()
  ]);

  if (access.error || !access.creatorProfile) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold text-white">{STUDIO_HELP_PAGE.title}</h1>
        <ErrorState message={access.error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  return (
    <section className="w-full min-w-0 space-y-4 pb-24 sm:pb-8">
      <Link
        className="inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href={studioPath("")}
      >
        ← Trở về tổng quan
      </Link>

      <StudioHelpPage
        contact={helpData.contact}
        faq={helpData.faq}
        minWithdrawAmountVnd={helpData.minWithdrawAmountVnd}
        payoutsEnabled={helpData.payoutsEnabled}
        userEmail={user?.email ?? null}
      />
    </section>
  );
}
