import Link from "next/link";
import { notFound } from "next/navigation";
import { SnippetVersionsList } from "@/components/admin/snippets/SnippetVersionsList";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import {
  getCodeSnippetById,
  listSnippetVersions
} from "@/lib/snippets/snippet-service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SnippetVersionsPage({ params }: PageProps) {
  const { id } = await params;
  const guard = await requireAnyPermission(["admin.snippets.view", "admin.snippets.rollback"], {
    returnTo: `/admin/developer/snippets/${id}/versions`
  });

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền" variant="danger" />;
  }

  const row = await getCodeSnippetById(id);
  if (!row) notFound();

  const versions = await listSnippetVersions(id);
  const canRollback = guard.context.permissions.includes("admin.snippets.rollback");

  return (
    <div className="space-y-5">
      <Link
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href={`/admin/developer/snippets/${id}`}
      >
        ← Sửa snippet
      </Link>
      <h1 className="text-2xl font-bold text-zinc-100">Lịch sử phiên bản</h1>
      <p className="text-sm text-zinc-400">{row.name}</p>
      <SnippetVersionsList
        canRollback={canRollback}
        currentCode={row.code}
        snippetId={id}
        versions={versions}
      />
    </div>
  );
}
