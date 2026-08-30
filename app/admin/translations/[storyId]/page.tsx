import Link from "next/link";
import { ErrorState } from "@/components/ui";
import { requirePermission } from "@/lib/auth/require-permission";
import { getTranslationRightsDetail } from "@/lib/admin/content-origin-admin";
import {
  updateTranslationMonetizationPolicyAction,
  updateTranslationRightsStatusAction
} from "@/app/admin/translations/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function TranslationRightsDetailPage({
  params,
  searchParams
}: PageProps) {
  const guard = await requirePermission("admin.dashboard.view", {
    returnTo: "/admin/translations"
  });
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" />;
  }

  const { storyId } = await params;
  const qs = await searchParams;
  const detail = await getTranslationRightsDetail(storyId);
  if (detail.error || !detail.data) {
    return <ErrorState message={detail.error} title="Không tải được chi tiết quyền dịch" />;
  }

  const d = detail.data;
  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin/translations">
          ← Danh sách translations
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-white">{d.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {d.contentOrigin === "translation" ? "Truyện Dịch" : "Truyện Sáng Tác"} · Creator:{" "}
          {d.creatorName}
        </p>
      </div>

      {qs.error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">
          {qs.error}
        </p>
      ) : null}
      {qs.success ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
          Đã cập nhật thành công.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Info label="source_title" value={d.sourceTitle} />
        <Info label="source_author_name" value={d.sourceAuthorName} />
        <Info label="source_url" value={d.sourceUrl} />
        <Info label="source_platform" value={d.sourcePlatform} />
        <Info label="original_language" value={d.originalLanguage} />
        <Info label="translated_language" value={d.translatedLanguage} />
        <Info label="translation_type" value={d.translationType} />
        <Info label="license_document_media" value={d.licenseDocumentMediaId} />
        <Info label="rights_status" value={d.rightsStatus} />
        <Info label="monetization_policy" value={d.monetizationPolicy} />
      </div>

      <article className="space-y-2 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <h2 className="text-lg font-semibold text-white">Monetization capabilities (policy engine)</h2>
        <p className="text-sm text-zinc-300">
          Miễn phí 100%: {d.capabilities.mustBeFreeToRead ? "Có" : "Không"}
        </p>
        <p className="text-sm text-zinc-300">
          Không được bán chương/bộ:{" "}
          {!d.capabilities.canSellChapters && !d.capabilities.canSellStoryBundle ? "Có" : "Không"}
        </p>
        <p className="text-sm text-zinc-300">
          Tips: {d.capabilities.canReceiveTips ? "Đã xác minh quyền" : "Cần xác minh quyền"} · Ads:{" "}
          {d.capabilities.canShareAdsRevenue ? "Đã xác minh quyền" : "Cần xác minh quyền"}
        </p>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={updateTranslationRightsStatusAction} className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
          <h3 className="text-base font-semibold text-white">Update rights status</h3>
          <input name="story_id" type="hidden" value={d.storyId} />
          <label className="block text-sm text-zinc-300">
            Action
            <select className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white" name="rights_action">
              <option value="verified">Mark verified</option>
              <option value="pending_review">Mark pending_review</option>
              <option value="rejected">Mark rejected</option>
              <option value="expired">Mark expired</option>
              <option value="request_more_info">Request more info</option>
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            rights_expires_at
            <input className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white" defaultValue={d.rightsExpiresAt ?? ""} name="rights_expires_at" placeholder="2026-12-31T00:00:00Z" />
          </label>
          <label className="block text-sm text-zinc-300">
            rights_review_note
            <textarea className="mt-1 min-h-24 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white" defaultValue={d.rightsReviewNote ?? ""} name="rights_review_note" />
          </label>
          <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950" type="submit">
            Cập nhật rights status
          </button>
        </form>

        <form action={updateTranslationMonetizationPolicyAction} className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
          <h3 className="text-base font-semibold text-white">Update monetization policy</h3>
          <input name="story_id" type="hidden" value={d.storyId} />
          <label className="block text-sm text-zinc-300">
            monetization_policy
            <select className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white" defaultValue={d.monetizationPolicy} name="monetization_policy">
              <option value="free_only">free_only</option>
              <option value="ads_tips_allowed">ads_tips_allowed</option>
              <option value="no_monetization">no_monetization</option>
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            rights_review_note
            <textarea className="mt-1 min-h-24 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white" defaultValue={d.rightsReviewNote ?? ""} name="rights_review_note" />
          </label>
          <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950" type="submit">
            Cập nhật monetization policy
          </button>
        </form>
      </div>

      <article className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <h2 className="text-lg font-semibold text-white">Audit log</h2>
        {d.auditLogs.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có audit log cho translation rights.</p>
        ) : (
          <ul className="space-y-2">
            {d.auditLogs.map((log) => (
              <li className="rounded-lg border border-white/10 bg-zinc-900/70 p-3 text-sm" key={log.id}>
                <p className="font-medium text-zinc-100">{log.action}</p>
                <p className="text-xs text-zinc-400">
                  {new Date(log.createdAt).toLocaleString("vi-VN")} · actor: {log.actorId ?? "system"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm text-zinc-100">{value?.trim() ? value : "—"}</p>
    </div>
  );
}
