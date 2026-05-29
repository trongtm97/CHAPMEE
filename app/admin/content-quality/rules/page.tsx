import Link from "next/link";
import { AdminQualitySettingsForm } from "@/components/admin/AdminQualitySettingsForm";
import { ErrorState } from "@/components/ui";
import { getQualityConfigForAdmin } from "@/lib/admin/update-quality-config";
import { requireModerationAccess } from "@/lib/auth/require-moderation-access";

export const dynamic = "force-dynamic";

export default async function AdminContentQualityRulesPage() {
  const guard = await requireModerationAccess("/admin/content-quality/rules");

  if (!guard.ok) {
    return (
      <section className="mx-auto max-w-[1320px] space-y-6">
        <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />
      </section>
    );
  }

  const config = await getQualityConfigForAdmin();

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/content-quality"
        >
          ← Chất lượng nội dung
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Cấu hình rule chất lượng</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Ngưỡng rating, báo cáo, số lần cảnh báo tối đa và hành vi ẩn/tắt kiếm tiền — không
          dùng AI.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Mặc định: {config.maxLowQualityAttempts} lần xử lý trước khi có thể ẩn vĩnh viễn.
        </p>
      </div>
      <AdminQualitySettingsForm initial={config} />
    </section>
  );
}
