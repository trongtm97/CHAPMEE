import Link from "next/link";
import { notFound } from "next/navigation";
import { AnnouncementForm } from "@/components/admin/announcements/AnnouncementForm";
import { ErrorState } from "@/components/ui";
import { buildAdminAnnouncementCapabilities } from "@/types/admin-announcements";
import { getAnnouncementById } from "@/lib/platform-content/announcements";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminAnnouncementEditRoute({ params }: PageProps) {
  const { id } = await params;

  const guard = await requireAnyPermission(
    ["platform.announcement.view", "platform.announcement.update", "admin.dashboard.view"],
    { returnTo: `/admin/announcements/${id}` }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { item, error } = await getAnnouncementById(id);
  if (error) {
    return <ErrorState message={error} title="Không thể tải thông báo" variant="danger" />;
  }

  if (!item) {
    notFound();
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
        <h1 className="text-2xl font-semibold text-white">Sửa thông báo</h1>
        <p className="text-sm text-zinc-400">{item.title}</p>
      </header>
      <AnnouncementForm announcement={item} capabilities={capabilities} mode="edit" />
    </section>
  );
}
