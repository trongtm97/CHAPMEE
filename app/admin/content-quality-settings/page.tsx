import Link from "next/link";
import { AdminQualitySettingsForm } from "@/components/admin/AdminQualitySettingsForm";
import { ErrorState } from "@/components/ui";
import { getQualityConfigForAdmin } from "@/lib/admin/update-quality-config";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminContentQualitySettingsRoute() {
  const guard = await requireAdminSettingsAccess("/admin/content-quality-settings");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState message={guard.error} title="Không có quyền" variant="danger" />
      </section>
    );
  }

  const config = await getQualityConfigForAdmin();

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Cấu hình chất lượng nội dung</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ngưỡng rating, báo cáo, số lần cảnh báo — không dùng AI.
        </p>
      </div>
      <AdminQualitySettingsForm initial={config} />
    </section>
  );
}
