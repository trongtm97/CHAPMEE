import { ContentPostCategoryForm } from "@/components/admin/content-posts/ContentPostCategoryForm";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminContentPostCategoryCreateRoute() {
  const guard = await requireAnyPermission(
    ["content.post.create", "admin.dashboard.view"],
    { returnTo: "/admin/content-hub/categories/new" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  return (
    <section className="space-y-4">
      <h1 className="sr-only">Tạo chuyên mục</h1>
      <ContentPostCategoryForm mode="create" />
    </section>
  );
}

