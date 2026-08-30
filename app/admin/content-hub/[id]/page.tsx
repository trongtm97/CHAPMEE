import { ContentPostForm } from "@/components/admin/content-posts/ContentPostForm";

import { ErrorState } from "@/components/ui";

import { buildAdminContentPostCapabilities } from "@/types/admin-content-posts";

import { getContentPostById } from "@/lib/platform-content/content-posts";
import { getCategoryIdsForPost, listContentPostCategories } from "@/lib/platform-content/content-post-categories";

import { requireAnyPermission } from "@/lib/auth/require-permission";

import { notFound } from "next/navigation";



export const dynamic = "force-dynamic";



type PageProps = {

  params: Promise<{ id: string }>;

};



export default async function AdminContentPostEditRoute({ params }: PageProps) {

  const { id } = await params;



  const guard = await requireAnyPermission(

    ["content.post.view", "content.post.update", "admin.dashboard.view"],

    { returnTo: `/admin/content-hub/${id}` }

  );



  if (!guard.ok) {

    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;

  }



  const { item, error } = await getContentPostById(id);

  if (error) {

    return <ErrorState message={error} title="Không thể tải bài viết" variant="danger" />;

  }



  if (!item) {

    notFound();

  }



  const capabilities = buildAdminContentPostCapabilities(guard.context.permissions);

  const [{ items: categories }, { ids: initialCategoryIds }] = await Promise.all([
    listContentPostCategories({ includeHidden: true }),
    getCategoryIdsForPost(item.id)
  ]);



  return (

    <section className="space-y-4">

      <h1 className="sr-only">Sửa bài viết: {item.title}</h1>

      <ContentPostForm
        capabilities={capabilities}
        categories={categories}
        initialCategoryIds={initialCategoryIds}
        mode="edit"
        post={item}
      />

    </section>

  );

}

