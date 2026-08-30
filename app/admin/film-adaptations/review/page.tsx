import Link from "next/link";
import { FilmAdminTable } from "@/components/admin/films/FilmAdminTable";
import { ErrorState } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getAdminFilmAdaptationList } from "@/lib/admin/film-adaptations-admin";

type AdminFilmReviewPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function AdminFilmAdaptationsReviewPage({
  searchParams
}: AdminFilmReviewPageProps) {
  const guard = await requireAdminSettingsAccess("/admin/film-adaptations/review");
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />;
  }
  const params = await searchParams;
  const data = await getAdminFilmAdaptationList({
    page: Number(params.page ?? "1"),
    pageSize: Number(params.pageSize ?? "20"),
    status: "pending_review",
    youtubeEmbedType: params.youtube_embed_type
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
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Film review</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Duyệt phim chờ review: approve/publish, reject, hide, copyright disputed. Request-info:
          TODO khi có notification workflow.
        </p>
      </div>
      <FilmAdminTable basePath="/admin/film-adaptations/review" compactActions data={data} />
    </section>
  );
}
