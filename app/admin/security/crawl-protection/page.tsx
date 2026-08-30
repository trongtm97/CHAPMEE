import Link from "next/link";

import { CrawlProtectionForm } from "@/components/admin/security/CrawlProtectionForm";

import { SecurityEventsPanel } from "@/components/admin/security/SecurityEventsPanel";

import { ErrorState } from "@/components/ui";

import { getAdminCrawlProtectionAction } from "@/lib/admin/crawl-protection-actions";

import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";



export const dynamic = "force-dynamic";



type CrawlProtectionPageProps = {

  searchParams: Promise<{ page?: string; eventType?: string }>;

};



export default async function CrawlProtectionAdminPage({ searchParams }: CrawlProtectionPageProps) {

  const guard = await requireAdminSettingsAccess("/admin/security/crawl-protection");



  if (!guard.ok) {

    return (

      <section className="space-y-6">

        <h1 className="text-3xl font-bold">Không có quyền</h1>

        <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />

      </section>

    );

  }



  const params = await searchParams;

  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const result = await getAdminCrawlProtectionAction();



  return (

    <section className="space-y-6">

      <div>

        <div className="flex flex-wrap items-center gap-3 text-sm">

          <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">

            ← Admin

          </Link>

          <span className="text-zinc-600">/</span>

          <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/admin/engagement">

            Tương tác đọc

          </Link>

        </div>

        <p className="mt-4 text-sm font-medium uppercase tracking-wide text-cyan-300">

          Admin · Bảo mật

        </p>

        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Chống crawl / bảo vệ nội dung</h1>

        <p className="mt-2 max-w-2xl text-sm text-zinc-400">

          Giảm scrape hàng loạt, bảo vệ API đọc chương, ghi log sự kiện. Không cloaking — SEO public

          vẫn hoạt động. Cấu hình thay đổi được audit.

        </p>

      </div>



      {!result.ok || !result.settings ? (

        <ErrorState message={result.error ?? "Lỗi"} title="Không tải cấu hình" />

      ) : (

        <>

          <CrawlProtectionForm settings={result.settings} />

          <SecurityEventsPanel eventType={params.eventType} page={page} />

        </>

      )}

    </section>

  );

}


