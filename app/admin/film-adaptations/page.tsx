import Link from "next/link";
import { FilmAdminTable } from "@/components/admin/films/FilmAdminTable";
import { ErrorState } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getAdminFilmAdaptationList } from "@/lib/admin/film-adaptations-admin";

type AdminFilmAdaptationsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function AdminFilmAdaptationsPage({
  searchParams
}: AdminFilmAdaptationsPageProps) {
  const guard = await requireAdminSettingsAccess("/admin/film-adaptations");
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />;
  }
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = Number(params.pageSize ?? "20");
  try {
    const data = await getAdminFilmAdaptationList({
      page,
      pageSize,
      search: params.search,
      status: params.status,
      rightsStatus: params.rights_status,
      adsPolicy: params.ads_policy,
      relationType: params.relation_type,
      youtubeEmbedType: params.youtube_embed_type,
      contentOrigin: params.content_origin as "original" | "translation" | undefined,
      unavailable: params.unavailable as "true" | "false" | undefined
    });
    return (
      <section className="space-y-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Admin · Phim chuyển thể
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Film Adaptation Center</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/5"
            href="/admin/film-adaptations/review"
          >
            Pending review
          </Link>
          <Link
            className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/5"
            href="/admin/film-adaptations/unavailable"
          >
            Unavailable YouTube
          </Link>
          <Link
            className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/5"
            href="/admin/film-adaptations/policy"
          >
            Policy
          </Link>
        </div>
        <form className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-5">
          <input
            className="rounded border border-white/20 bg-black/30 px-2 py-2"
            defaultValue={params.search ?? ""}
            name="search"
            placeholder="Search title/story/creator"
          />
          <select
            className="rounded border border-white/20 bg-black/30 px-2 py-2"
            defaultValue={params.status ?? ""}
            name="status"
          >
            <option value="">Status</option>
            <option value="draft">draft</option>
            <option value="pending_review">pending_review</option>
            <option value="published">published</option>
            <option value="hidden">hidden</option>
            <option value="rejected">rejected</option>
            <option value="copyright_disputed">copyright_disputed</option>
            <option value="unavailable">unavailable</option>
          </select>
          <select
            className="rounded border border-white/20 bg-black/30 px-2 py-2"
            defaultValue={params.rights_status ?? ""}
            name="rights_status"
          >
            <option value="">Rights status</option>
            <option value="self_declared">self_declared</option>
            <option value="verified">verified</option>
            <option value="disputed">disputed</option>
            <option value="rejected">rejected</option>
            <option value="pending_review">pending_review</option>
          </select>
          <select
            className="rounded border border-white/20 bg-black/30 px-2 py-2"
            defaultValue={params.ads_policy ?? ""}
            name="ads_policy"
          >
            <option value="">Ads policy</option>
            <option value="inherit">inherit</option>
            <option value="ads_allowed">ads_allowed</option>
            <option value="ads_disabled">ads_disabled</option>
            <option value="pending_review">pending_review</option>
          </select>
          <select
            className="rounded border border-white/20 bg-black/30 px-2 py-2"
            defaultValue={params.relation_type ?? ""}
            name="relation_type"
          >
            <option value="">Relation type</option>
            <option value="based_on_story">based_on_story</option>
            <option value="inspired_by_story">inspired_by_story</option>
            <option value="official_adaptation">official_adaptation</option>
            <option value="fan_adaptation">fan_adaptation</option>
            <option value="trailer">trailer</option>
            <option value="short_film">short_film</option>
            <option value="animation">animation</option>
            <option value="cinematic_scene">cinematic_scene</option>
          </select>
          <select
            className="rounded border border-white/20 bg-black/30 px-2 py-2"
            defaultValue={params.youtube_embed_type ?? ""}
            name="youtube_embed_type"
          >
            <option value="">YouTube type</option>
            <option value="video">video</option>
            <option value="playlist">playlist</option>
          </select>
          <select
            className="rounded border border-white/20 bg-black/30 px-2 py-2"
            defaultValue={params.content_origin ?? ""}
            name="content_origin"
          >
            <option value="">Content origin</option>
            <option value="original">original</option>
            <option value="translation">translation</option>
          </select>
          <select
            className="rounded border border-white/20 bg-black/30 px-2 py-2"
            defaultValue={params.unavailable ?? ""}
            name="unavailable"
          >
            <option value="">Unavailable</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
          <button className="rounded bg-cyan-300 px-3 py-2 text-sm font-bold text-zinc-950" type="submit">
            Lọc
          </button>
        </form>
        <FilmAdminTable basePath="/admin/film-adaptations" data={data} />
      </section>
    );
  } catch (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Không tải được Film Center"}
        title="Lỗi tải dữ liệu"
        variant="danger"
      />
    );
  }
}
