import Link from "next/link";
import { AudioAdminTable } from "@/src/components/admin/audio/AudioAdminTable";
import { ErrorState } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getAdminAudioList } from "@/lib/admin/audio-admin";

type AdminAudioBrokenPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function AdminAudioBrokenPage({ searchParams }: AdminAudioBrokenPageProps) {
  const guard = await requireAdminSettingsAccess("/admin/audio/broken-links");
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />;
  }
  const params = await searchParams;
  const data = await getAdminAudioList({
    page: Number(params.page ?? "1"),
    pageSize: Number(params.pageSize ?? "20"),
    broken: "true"
  });

  return (
    <section className="space-y-5">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin/audio">← Audio Center</Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Broken links</h1>
        <p className="mt-1 text-sm text-zinc-400">Danh sách audio broken/failed để recheck, hide, mark ok, disable ads.</p>
      </div>
      <AudioAdminTable basePath="/admin/audio/broken-links" data={data} />
    </section>
  );
}
