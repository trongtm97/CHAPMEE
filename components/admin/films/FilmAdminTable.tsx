import Link from "next/link";
import { runFilmAdminItemAction, runFilmRecheckAction } from "@/app/admin/film-adaptations/actions";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import type { FilmAdminListResult } from "@/lib/admin/film-adaptations-admin";
import { getStoryDetailHref } from "@/lib/stories/story-routes";

type FilmAdminTableProps = {
  data: FilmAdminListResult;
  basePath: string;
  /** Hide publish/reject on review-only pages if needed */
  compactActions?: boolean;
};

function ActionButton({ filmId, action, label }: { filmId: string; action: string; label: string }) {
  return (
    <form action={runFilmAdminItemAction}>
      <input name="film_id" type="hidden" value={filmId} />
      <input name="action" type="hidden" value={action} />
      <button
        className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/5"
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

export function FilmAdminTable({ data, basePath, compactActions }: FilmAdminTableProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-zinc-300">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Story</th>
              <th className="px-3 py-2">Creator</th>
              <th className="px-3 py-2">YouTube</th>
              <th className="px-3 py-2">Relation</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Rights</th>
              <th className="px-3 py-2">Ads</th>
              <th className="px-3 py-2">Last check</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const storyHref =
                row.storySlug && row.storyPublicCode
                  ? getStoryDetailHref({
                      slug: row.storySlug,
                      public_code: row.storyPublicCode
                    })
                  : row.storySlug
                    ? `/truyen/${row.storySlug}`
                    : "#";
              return (
              <tr className="border-t border-white/10 align-top" key={row.id}>
                <td className="px-3 py-2 text-zinc-100">{row.title}</td>
                <td className="px-3 py-2">
                  <Link className="text-cyan-200 hover:text-cyan-100" href={storyHref}>
                    {row.storyTitle}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-300">{row.creatorName}</td>
                <td className="px-3 py-2 text-zinc-300">{row.youtubeEmbedType}</td>
                <td className="px-3 py-2 text-zinc-300">{row.relationType}</td>
                <td className="px-3 py-2 text-zinc-300">{row.status}</td>
                <td className="px-3 py-2 text-zinc-300">{row.rightsStatus}</td>
                <td className="px-3 py-2 text-zinc-300">{row.adsPolicy}</td>
                <td className="px-3 py-2 text-zinc-300">
                  {row.lastCheckedAt
                    ? `${row.lastCheckStatus ?? "unknown"}`
                    : "-"}
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {new Date(row.createdAt).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/5"
                      href={storyHref}
                    >
                      View
                    </Link>
                    {compactActions ? (
                      <>
                        <ActionButton action="publish" filmId={row.id} label="Approve" />
                        <ActionButton action="reject" filmId={row.id} label="Reject" />
                        <ActionButton action="hide" filmId={row.id} label="Hide" />
                        <ActionButton
                          action="mark_copyright_disputed"
                          filmId={row.id}
                          label="Copyright"
                        />
                      </>
                    ) : (
                      <>
                        <ActionButton action="publish" filmId={row.id} label="Publish" />
                        <ActionButton action="hide" filmId={row.id} label="Hide" />
                        <ActionButton action="reject" filmId={row.id} label="Reject" />
                        <ActionButton action="mark_unavailable" filmId={row.id} label="Unavailable" />
                        <ActionButton
                          action="mark_copyright_disputed"
                          filmId={row.id}
                          label="Copyright"
                        />
                        <ActionButton
                          action="mark_rights_verified"
                          filmId={row.id}
                          label="Rights OK"
                        />
                        <ActionButton action="enable_ads" filmId={row.id} label="Enable ads" />
                      </>
                    )}
                    <ActionButton action="mark_ok" filmId={row.id} label="Mark OK" />
                    <ActionButton action="disable_ads" filmId={row.id} label="Disable ads" />
                    <form action={runFilmRecheckAction}>
                      <input name="film_id" type="hidden" value={row.id} />
                      <button
                        className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/5"
                        type="submit"
                      >
                        Recheck
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            );
            })}
            {data.rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-zinc-400" colSpan={11}>
                  Không có phim chuyển thể phù hợp bộ lọc.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <AdminListPagination
        basePath={basePath}
        page={data.page}
        pageSize={data.pageSize}
        total={data.totalCount}
        totalPages={data.totalPages}
      />
    </div>
  );
}
