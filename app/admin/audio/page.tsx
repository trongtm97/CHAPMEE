import Link from "next/link";
import { AudioAdminTable } from "@/src/components/admin/audio/AudioAdminTable";
import { ErrorState } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getAdminAudioList } from "@/lib/admin/audio-admin";

type AdminAudioPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function AdminAudioPage({ searchParams }: AdminAudioPageProps) {
  const guard = await requireAdminSettingsAccess("/admin/audio");
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />;
  }
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = Number(params.pageSize ?? "20");
  try {
    const data = await getAdminAudioList({
      page,
      pageSize,
      search: params.search,
      sourceType: params.source_type,
      status: params.status,
      rightsStatus: params.rights_status,
      adsPolicy: params.ads_policy,
      backgroundAllowed: (params.background_allowed as "true" | "false" | undefined) ?? undefined,
      continuousAllowed: (params.continuous_allowed as "true" | "false" | undefined) ?? undefined,
      contentOrigin: (params.content_origin as "original" | "translation" | undefined) ?? undefined,
      provider: params.provider,
      broken: (params.broken as "true" | "false" | undefined) ?? undefined
    });
    return (
      <section className="space-y-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">Admin · Audio</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Audio Center</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/5" href="/admin/audio/review">Pending review</Link>
          <Link className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/5" href="/admin/audio/broken-links">Broken links</Link>
          <Link className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/5" href="/admin/audio/policy">Policy</Link>
        </div>
        <form className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-5">
          <input className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.search ?? ""} name="search" placeholder="Search story/creator/title" />
          <input className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.provider ?? ""} name="provider" placeholder="Provider/domain" />
          <select className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.source_type ?? ""} name="source_type">
            <option value="">Source type</option>
            <option value="external_audio_url">External</option>
            <option value="youtube_embed">YouTube</option>
          </select>
          <select className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.status ?? ""} name="status">
            <option value="">Status</option>
            <option value="draft">draft</option>
            <option value="pending_review">pending_review</option>
            <option value="published">published</option>
            <option value="hidden">hidden</option>
            <option value="broken">broken</option>
          </select>
          <select className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.rights_status ?? ""} name="rights_status">
            <option value="">Rights status</option>
            <option value="self_declared">self_declared</option>
            <option value="verified">verified</option>
            <option value="disputed">disputed</option>
          </select>
          <select className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.ads_policy ?? ""} name="ads_policy">
            <option value="">Ads policy</option>
            <option value="inherit">inherit</option>
            <option value="ads_allowed">ads_allowed</option>
            <option value="ads_disabled">ads_disabled</option>
          </select>
          <select className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.background_allowed ?? ""} name="background_allowed">
            <option value="">Background allowed</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
          <select className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.continuous_allowed ?? ""} name="continuous_allowed">
            <option value="">Continuous allowed</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
          <select className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.content_origin ?? ""} name="content_origin">
            <option value="">Content origin</option>
            <option value="original">original</option>
            <option value="translation">translation</option>
          </select>
          <select className="rounded border border-white/20 bg-black/30 px-2 py-2" defaultValue={params.broken ?? ""} name="broken">
            <option value="">Broken</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
          <button className="rounded bg-cyan-300 px-3 py-2 text-sm font-bold text-zinc-950" type="submit">Lọc</button>
        </form>
        <AudioAdminTable basePath="/admin/audio" data={data} />
      </section>
    );
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Không tải được Audio Center"} title="Lỗi tải dữ liệu" variant="danger" />;
  }
}
