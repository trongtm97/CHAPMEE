import Link from "next/link";

import { SiteLaunchSettingsForm } from "@/components/admin/SiteLaunchSettingsForm";
import { ErrorState } from "@/components/ui";
import { getAdminSiteLaunchSettingsAction } from "@/lib/admin/site-launch-actions";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { fetchAppSettingByKey } from "@/lib/data/app-settings";
import { SITE_LAUNCH_SETTINGS_KEY } from "@/lib/settings/site-launch-settings";

export const dynamic = "force-dynamic";

export default async function AdminSiteLaunchSettingsPage() {
  const guard = await requireAdminSettingsAccess("/admin/settings/launch");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold">Không có quyền</h1>
        <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />
      </section>
    );
  }

  const result = await getAdminSiteLaunchSettingsAction();
  const row = await fetchAppSettingByKey(SITE_LAUNCH_SETTINGS_KEY);

  if (!result.ok || !result.settings) {
    return <ErrorState message={result.error ?? "Lỗi"} title="Không tải cấu hình" />;
  }

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
          Admin · Ra mắt
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal sm:text-3xl">
          Coming soon & chặn crawler
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Bật Coming soon để khách chỉ thấy trang chờ. Bật chặn crawler để Google/Bing không index
          tạm thời. Có thể dùng riêng hoặc cùng lúc trước khi mở site.
        </p>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/90">
        Khuyến nghị trước go-live: bật <strong>chặn crawler</strong> và <strong>Coming soon</strong>
        , kiểm tra site bằng tài khoản admin, rồi tắt lần lượt khi sẵn sàng công khai.
      </div>

      <SiteLaunchSettingsForm
        initialSettings={result.settings}
        updatedAt={row?.updated_at ?? null}
      />
    </section>
  );
}
