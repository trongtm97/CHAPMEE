import Link from "next/link";
import { FilmAdminTable } from "@/components/admin/films/FilmAdminTable";
import { ErrorState } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getAdminFilmAdaptationList } from "@/lib/admin/film-adaptations-admin";

type AdminFilmUnavailablePageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function AdminFilmAdaptationsUnavailablePage({
  searchParams
}: AdminFilmUnavailablePageProps) {
  const guard = await requireAdminSettingsAccess("/admin/film-adaptations/unavailable");
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />;
  }
  const params = await searchParams;
  const data = await getAdminFilmAdaptationList({
    page: Number(params.page ?? "1"),
    pageSize: Number(params.pageSize ?? "20"),
    unavailable: "true"
  });

  return (
    <section className="space-y-5">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/film-adaptations"
        >
          ← Film Center
        </Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Unavailable YouTube</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Phim unavailable hoặc kiểm tra YouTube failed — recheck, hide, mark ok, disable ads.
        </p>
      </div>
      <FilmAdminTable basePath="/admin/film-adaptations/unavailable" data={data} />
    </section>
  );
}
