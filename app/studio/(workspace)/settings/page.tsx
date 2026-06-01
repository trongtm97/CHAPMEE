import type { Metadata } from "next";
import { StudioSettingsPageClient } from "@/components/studio/settings/StudioSettingsPageClient";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getStudioSettingsPageData } from "@/lib/studio/get-studio-settings-page-data";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { studioPath } from "@/lib/studio/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cài đặt Studio — ChapMee Studio",
    description: "Quản lý hồ sơ công khai và thiết lập tài khoản viết truyện.",
    alternates: { canonical: buildCanonicalUrl(studioPath("/settings")) }
  };
}

export default async function StudioSettingsPage() {
  const [{ user }, access] = await Promise.all([
    getCurrentUser(),
    getStudioAccess(studioPath("/settings"))
  ]);

  if (access.error || !access.creatorProfile) {
    return (
      <section className="w-full min-w-0 space-y-6">
        <h1 className="text-2xl font-bold text-white">Cài đặt Studio</h1>
        <ErrorState message={access.error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const pageData = await getStudioSettingsPageData(access.creatorProfile);

  return (
    <section className="w-full min-w-0">
      <StudioSettingsPageClient {...pageData} email={user?.email ?? null} />
    </section>
  );
}
