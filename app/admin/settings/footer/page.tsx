import Link from "next/link";
import { FooterSettingsForm } from "@/components/admin/FooterSettingsForm";
import { ErrorState } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getFooterConfig } from "@/lib/settings/get-footer-config";

export const dynamic = "force-dynamic";

export default async function AdminFooterSettingsPage() {
  const guard = await requireAdminSettingsAccess("/admin/settings/footer");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">
            Không có quyền truy cập
          </h1>
        </div>
        <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />
      </section>
    );
  }

  const { config, updatedAt } = await getFooterConfig({ useCache: false });

  return (
    <section className="space-y-5">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin"
        >
          ← Admin
        </Link>
        <p className="mt-4 text-sm font-medium uppercase tracking-wide text-cyan-300">
          Admin · Cài đặt
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal sm:text-3xl">
          Footer
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Quản lý copyright, liên kết pháp lý, badge tuân thủ và liên hệ chính
          thức ChapMee. DMCA và Bộ Công Thương mặc định tắt — chỉ bật khi đã có
          tài liệu xác thực.
        </p>
      </div>

      <FooterSettingsForm initialConfig={config} updatedAt={updatedAt} />
    </section>
  );
}
