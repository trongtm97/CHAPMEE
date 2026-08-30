import { notFound } from "next/navigation";

import { ContentPostCategoryForm } from "@/components/admin/content-posts/ContentPostCategoryForm";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { getContentPostCategoryById } from "@/lib/platform-content/content-post-categories";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminContentPostCategoryEditRoute({ params }: PageProps) {
  const { id } = await params;

  const guard = await requireAnyPermission(
    ["content.post.view", "content.post.update", "admin.dashboard.view"],
    { returnTo: `/admin/content-hub/categories/${id}` }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { item, error } = await getContentPostCategoryById(id);
  if (error) {
    return <ErrorState message={error} title="Không thể tải chuyên mục" variant="danger" />;
  }

  if (!item) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <h1 className="sr-only">Sửa chuyên mục: {item.name}</h1>
      <ContentPostCategoryForm category={item} mode="edit" />
    </section>
  );
}

