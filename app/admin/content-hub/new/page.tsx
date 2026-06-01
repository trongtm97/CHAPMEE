import { ContentPostForm } from "@/components/admin/content-posts/ContentPostForm";

import { ErrorState } from "@/components/ui";

import { buildAdminContentPostCapabilities } from "@/types/admin-content-posts";

import { requireAnyPermission } from "@/lib/auth/require-permission";



export const dynamic = "force-dynamic";



export default async function AdminContentPostCreateRoute() {

  const guard = await requireAnyPermission(

    ["content.post.create", "admin.dashboard.view"],

    { returnTo: "/admin/content-hub/new" }

  );



  if (!guard.ok) {

    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;

  }



  const capabilities = buildAdminContentPostCapabilities(guard.context.permissions);



  return (

    <section className="space-y-4">

      <h1 className="sr-only">Tạo bài viết</h1>

      <ContentPostForm capabilities={capabilities} mode="create" />

    </section>

  );

}

