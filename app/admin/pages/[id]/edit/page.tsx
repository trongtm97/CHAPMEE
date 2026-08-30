import { notFound } from "next/navigation";
import { PolicyForm } from "@/components/admin/policies/PolicyForm";
import { ErrorState } from "@/components/ui";
import { getPolicyPageById } from "@/lib/policies/policy-pages";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminPolicyCapabilities } from "@/types/policy-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminSitePageEditRoute({ params, searchParams }: PageProps) {
  const guard = await requireAnyPermission(["policies.edit", "policies.view", "content.post.update"], {
    returnTo: "/admin/pages"
  });

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { id } = await params;
  const query = await searchParams;
  const { item, error } = await getPolicyPageById(id);
  if (error) {
    return <ErrorState message={error} title="Lỗi tải trang" />;
  }
  if (!item) {
    notFound();
  }

  const capabilities = buildAdminPolicyCapabilities(guard.context.permissions);

  return (
    <section>
      <PolicyForm
        capabilities={capabilities}
        initialTab={query.tab === "versions" ? "versions" : "edit"}
        item={item}
      />
    </section>
  );
}
