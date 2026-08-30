import Link from "next/link";
import { ErrorState } from "@/components/ui";
import { requirePermission } from "@/lib/auth/require-permission";
import { getTranslatedStories } from "@/lib/admin/content-origin-admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    rights_status?: string;
    monetization_policy?: string;
    missing_metadata?: string;
    status?: string;
  }>;
};

export default async function AdminTranslationsPage({ searchParams }: PageProps) {
  const guard = await requirePermission("admin.dashboard.view", {
    returnTo: "/admin/translations"
  });
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const data = await getTranslatedStories({
    page,
    rightsStatus:
      params.rights_status &&
      ["verified", "pending_review", "unverified", "rejected", "expired"].includes(
        params.rights_status
      )
        ? (params.rights_status as
            | "verified"
            | "pending_review"
            | "unverified"
            | "rejected"
            | "expired")
        : "all",
    monetizationPolicy:
      params.monetization_policy &&
      ["free_only", "ads_tips_allowed", "no_monetization"].includes(params.monetization_policy)
        ? (params.monetization_policy as
            | "free_only"
            | "ads_tips_allowed"
            | "no_monetization")
        : "all",
    missingMetadata: params.missing_metadata === "1",
    status:
      params.status === "published" || params.status === "draft" ? params.status : "all"
  });

  if (data.error || !data.data) {
    return <ErrorState message={data.error} title="Không tải được danh sách truyện dịch" />;
  }

  const { rows, totalPages } = data.data;
  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-white">Translation Rights Queue</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Lọc truyện dịch chưa xác minh quyền, rejected/expired, hoặc thiếu metadata nguồn.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-white/10 bg-zinc-950/60 p-4 md:grid-cols-4">
        <input name="page" type="hidden" value="1" />
        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">rights_status</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            defaultValue={params.rights_status ?? "all"}
            name="rights_status"
          >
            <option value="all">Tất cả</option>
            <option value="pending_review">pending_review</option>
            <option value="verified">verified</option>
            <option value="unverified">unverified</option>
            <option value="rejected">rejected</option>
            <option value="expired">expired</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">monetization_policy</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            defaultValue={params.monetization_policy ?? "all"}
            name="monetization_policy"
          >
            <option value="all">Tất cả</option>
            <option value="free_only">free_only</option>
            <option value="ads_tips_allowed">ads_tips_allowed</option>
            <option value="no_monetization">no_monetization</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Trạng thái story</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            defaultValue={params.status ?? "all"}
            name="status"
          >
            <option value="all">Tất cả</option>
            <option value="published">published/approved</option>
            <option value="draft">draft/pending</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-zinc-200">
          <input defaultChecked={params.missing_metadata === "1"} name="missing_metadata" type="checkbox" value="1" />
          missing metadata
        </label>
        <button
          className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950"
          type="submit"
        >
          Lọc
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-zinc-400">
            <tr>
              <th className="px-3 py-2">Story</th>
              <th className="px-3 py-2">rights_status</th>
              <th className="px-3 py-2">monetization_policy</th>
              <th className="px-3 py-2">Ads/Tips</th>
              <th className="px-3 py-2">Metadata</th>
              <th className="px-3 py-2">Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-white/10" key={row.storyId}>
                <td className="px-3 py-2">
                  <Link
                    className="text-cyan-300 hover:text-cyan-200"
                    href={`/admin/translations/${row.storyId}`}
                  >
                    {row.title}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.rightsStatus}</td>
                <td className="px-3 py-2">{row.monetizationPolicy}</td>
                <td className="px-3 py-2">
                  {row.canShareAdsRevenue || row.canReceiveTips
                    ? "Đã xác minh quyền"
                    : "Cần xác minh quyền"}
                </td>
                <td className="px-3 py-2">
                  {row.hasMissingMetadata ? "Thiếu metadata" : "Đầy đủ"}
                </td>
                <td className="px-3 py-2">{new Date(row.updatedAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          Trang {page}/{totalPages}
        </span>
        <div className="flex gap-2">
          <Link
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-200"
            href={`/admin/translations?page=${Math.max(1, page - 1)}`}
          >
            Trước
          </Link>
          <Link
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-200"
            href={`/admin/translations?page=${Math.min(totalPages, page + 1)}`}
          >
            Sau
          </Link>
        </div>
      </div>
    </section>
  );
}
