"use client";

import { useActionState } from "react";
import { ImportRightsConsentNotice } from "@/components/legal/ImplicitConsentNotice";
import {
  uploadImportFileAction,
  type ImportPipelineActionState
} from "@/lib/admin/import-pipeline-actions";

const initialState: ImportPipelineActionState = { ok: false, error: null };

export function ImportPipelineUploadForm() {
  const [state, action, pending] = useActionState(uploadImportFileAction, initialState);

  return (
    <form action={action} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold text-white">Upload nguồn import</h2>
      <p className="text-sm text-slate-300">
        Chỉ upload nội dung bạn có quyền sử dụng. File lưu trên MinIO/S3 — không lưu raw trong DB.
      </p>

      <label className="block space-y-1 text-sm">
        <span className="text-slate-300">File (.txt, .md, .json)</span>
        <input
          required
          accept=".txt,.md,.json"
          className="block w-full text-sm text-slate-200"
          name="file"
          type="file"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-slate-300">Tên nguồn (dedupe)</span>
        <input
          className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
          name="source_name"
          placeholder="vd: partner-x-2026"
          type="text"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-slate-300">Owner profile ID (UUID tác giả)</span>
        <input
          className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
          name="owner_profile_id"
          placeholder="profiles.id của creator"
          type="text"
        />
      </label>

      <ImportRightsConsentNotice />

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input name="auto_parse" type="checkbox" />
        Parse ngay sau upload
      </label>

      <button
        className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "Đang upload…" : "Upload & tạo job"}
      </button>

      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      {state.ok && state.jobId ? (
        <p className="text-sm text-emerald-300">
          Đã tạo job.{" "}
          <a className="underline" href={`/admin/imports/${state.jobId}`}>
            Mở chi tiết →
          </a>
        </p>
      ) : null}
    </form>
  );
}
