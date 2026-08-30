import Link from "next/link";
import { SnippetEditorForm } from "@/components/admin/snippets/SnippetEditorForm";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function NewSnippetPage() {
  const guard = await requireAnyPermission(["admin.snippets.create", "admin.snippets.update"], {
    returnTo: "/admin/developer/snippets/new"
  });

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền" variant="danger" />;
  }

  const canActivate = guard.context.permissions.includes("admin.snippets.activate");

  return (
    <div className="space-y-5">
      <Link
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href="/admin/developer/snippets"
      >
        ← Danh sách snippet
      </Link>
      <h1 className="text-2xl font-bold text-zinc-100">Tạo snippet</h1>
      <SnippetEditorForm canActivate={canActivate} canDelete={false} />
    </div>
  );
}
