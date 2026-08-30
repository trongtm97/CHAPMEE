import { PolicyForm } from "@/components/admin/policies/PolicyForm";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminPolicyCapabilities } from "@/types/policy-pages";

export const dynamic = "force-dynamic";

export default async function AdminSitePageNewRoute() {
  const guard = await requireAnyPermission(["policies.create", "content.post.create"], {
    returnTo: "/admin/pages/new"
  });

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminPolicyCapabilities(guard.context.permissions);

  return (
    <section>
      <PolicyForm capabilities={capabilities} />
    </section>
  );
}
