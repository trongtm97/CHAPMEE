import Link from "next/link";
import { runAudioAdminItemAction, runAudioRecheckAction } from "@/app/admin/audio/actions";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import type { AudioAdminListResult } from "@/lib/admin/audio-admin";

type AudioAdminTableProps = {
  data: AudioAdminListResult;
  basePath: string;
};

function ActionButton({ audioId, action, label }: { audioId: string; action: string; label: string }) {
  return (
    <form action={runAudioAdminItemAction}>
      <input name="audio_id" type="hidden" value={audioId} />
      <input name="action" type="hidden" value={action} />
      <button className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/5" type="submit">
        {label}
      </button>
    </form>
  );
}

export function AudioAdminTable({ data, basePath }: AudioAdminTableProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-zinc-300">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Story</th>
              <th className="px-3 py-2">Creator</th>
              <th className="px-3 py-2">Part</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Rights</th>
              <th className="px-3 py-2">Ads</th>
              <th className="px-3 py-2">Bg</th>
              <th className="px-3 py-2">Continuous</th>
              <th className="px-3 py-2">Provider/Domain</th>
              <th className="px-3 py-2">Last check</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr className="border-t border-white/10 align-top" key={row.id}>
                <td className="px-3 py-2 text-zinc-100">{row.title}</td>
                <td className="px-3 py-2">
                  <Link className="text-cyan-200 hover:text-cyan-100" href={row.storySlug ? `/truyen/${row.storySlug}` : "#"}>
                    {row.storyTitle}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-300">{row.creatorName}</td>
                <td className="px-3 py-2 text-zinc-300">{row.partNumber ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">{row.sourceType}</td>
                <td className="px-3 py-2 text-zinc-300">{row.status}</td>
                <td className="px-3 py-2 text-zinc-300">{row.rightsStatus}</td>
                <td className="px-3 py-2 text-zinc-300">{row.adsPolicy}</td>
                <td className="px-3 py-2 text-zinc-300">{row.backgroundAllowed ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-zinc-300">{row.continuousAllowed ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-zinc-300">{row.providerName ?? row.domain ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">{row.lastCheckedAt ? `${row.lastCheckStatus ?? "unknown"}` : "-"}</td>
                <td className="px-3 py-2 text-zinc-400">{new Date(row.createdAt).toLocaleDateString("vi-VN")}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Link className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/5" href={`/truyen/${row.storySlug ?? ""}`}>
                      View
                    </Link>
                    <ActionButton action="publish" audioId={row.id} label="Publish" />
                    <ActionButton action="hide" audioId={row.id} label="Hide" />
                    <ActionButton action="reject" audioId={row.id} label="Reject" />
                    <ActionButton action="mark_broken" audioId={row.id} label="Mark broken" />
                    <ActionButton action="mark_copyright_disputed" audioId={row.id} label="Copyright" />
                    <ActionButton action="mark_rights_verified" audioId={row.id} label="Rights verified" />
                    <ActionButton action="disable_ads" audioId={row.id} label="Disable ads" />
                    <ActionButton action="enable_ads" audioId={row.id} label="Enable ads" />
                    <ActionButton action="disable_continuous_playback" audioId={row.id} label="Disable continuous" />
                    <form action={runAudioRecheckAction}>
                      <input name="audio_id" type="hidden" value={row.id} />
                      <button className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/5" type="submit">
                        Recheck
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {data.rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-zinc-400" colSpan={14}>
                  Không có audio phù hợp bộ lọc.
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
