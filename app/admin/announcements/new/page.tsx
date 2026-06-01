import Link from "next/link";
import { AnnouncementForm } from "@/components/admin/announcements/AnnouncementForm";
import { ErrorState } from "@/components/ui";
import { buildAdminAnnouncementCapabilities } from "@/types/admin-announcements";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementCreateRoute() {
  const guard = await requireAnyPermission(
    ["platform.announcement.create", "admin.dashboard.view"],
    { returnTo: "/admin/announcements/new" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminAnnouncementCapabilities(guard.context.permissions);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          className="text-sm text-zinc-400 transition hover:text-zinc-200"
          href="/admin/announcements"
        >
          ← Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-semibold text-white">Tạo thông báo</h1>
      </header>
      <AnnouncementForm capabilities={capabilities} mode="create" />
    </section>
  );
}
