import { AdminStoryFormatsPage } from "@/components/admin/composer/AdminStoryFormatsPage";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Định dạng truyện & Composer | Admin ChapMee"
};

export default async function AdminStoryFormatsRoute() {
  const guard = await requireAnyPermission(
    ["taxonomy.view", "taxonomy.templates.manage", "admin.settings.update"],
    { returnTo: "/admin/story-formats" }
  );

  if (!guard.ok) {
    return (
      <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />
    );
  }

  return (
    <section className="space-y-6">
      <AdminStoryFormatsPage />
    </section>
  );
}
