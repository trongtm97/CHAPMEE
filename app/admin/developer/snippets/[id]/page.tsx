import Link from "next/link";
import { notFound } from "next/navigation";
import { SnippetEditorForm } from "@/components/admin/snippets/SnippetEditorForm";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { getCodeSnippetById } from "@/lib/snippets/snippet-service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSnippetPage({ params }: PageProps) {
  const { id } = await params;
  const guard = await requireAnyPermission(["admin.snippets.view", "admin.snippets.update"], {
    returnTo: `/admin/developer/snippets/${id}`
  });

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền" variant="danger" />;
  }

  const row = await getCodeSnippetById(id);
  if (!row || row.archivedAt) {
    notFound();
  }

  const canActivate = guard.context.permissions.includes("admin.snippets.activate");
  const canDelete = guard.context.permissions.includes("admin.snippets.delete");

  return (
    <div className="space-y-5">
      <Link
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href="/admin/developer/snippets"
      >
        ← Danh sách snippet
      </Link>
      <h1 className="text-2xl font-bold text-zinc-100">Sửa: {row.name}</h1>
      <p className="text-xs text-zinc-500 font-mono">{row.slug}</p>
      <SnippetEditorForm
        canActivate={canActivate}
        canDelete={canDelete}
        initial={row}
      />
    </div>
  );
}
