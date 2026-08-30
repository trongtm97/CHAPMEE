import Link from "next/link";
import type { Metadata } from "next";

import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { PageHeading } from "@/components/seo/PageHeading";
import { getSiteLaunchSettings } from "@/lib/settings/get-site-launch-settings";
import { buildRobotsMeta, SITE_NAME } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Sắp ra mắt | ${SITE_NAME}`,
    robots: buildRobotsMeta({ indexable: false, followLinks: false })
  };
}

export default async function ComingSoonPage() {
  const settings = await getSiteLaunchSettings();

  return (
    <ResponsivePageContainer className="flex min-h-[60vh] flex-col items-center justify-center py-16">
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <p className="page-kicker">ChapMee</p>
        <PageHeading className="page-title">{settings.coming_soon_title}</PageHeading>
        <p className="page-copy whitespace-pre-line text-zinc-400">
          {settings.coming_soon_message}
        </p>
        {settings.show_login_link ? (
          <p className="text-sm">
            <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/login">
              Đăng nhập
            </Link>
            <span className="text-zinc-600"> · dành cho đội vận hành</span>
          </p>
        ) : null}
      </div>
    </ResponsivePageContainer>
  );
}
