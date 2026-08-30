"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  archiveSnippetAction,
  duplicateSnippetAction,
  saveSnippetAction,
  setSnippetStatusAction,
  validateSnippetPreviewAction
} from "@/lib/admin/snippet-actions";
import type { CodeSnippetRow } from "@/lib/db/schema/code-snippets";
import { SNIPPET_TYPE_LABELS } from "@/lib/snippets/constants";
import { looksLikeSnippetHtml, parseSnippetMarkup } from "@/lib/snippets/parse-snippet-markup";
import { sanitizeSnippetHtml } from "@/lib/snippets/sanitize-html";
import {
  PLACEMENT_MODES,
  SNIPPET_DEVICE_TARGETS,
  SNIPPET_STATUSES,
  SNIPPET_TYPES,
  SNIPPET_USER_TARGETS,
  type SnippetFormInput,
  type SnippetPlacementConfig
} from "@/lib/snippets/types";

function parsePlacement(row?: CodeSnippetRow | null): SnippetPlacementConfig {
  const raw = row?.placementConfig;
  if (!raw || typeof raw !== "object") return { mode: "global" };
  const p = raw as SnippetPlacementConfig;
  return { mode: p.mode ?? "global", pageGroup: p.pageGroup ?? "", allowOnLegalRoutes: p.allowOnLegalRoutes, allowScriptsOnLegal: p.allowScriptsOnLegal };
}

function parseRoutes(row?: CodeSnippetRow | null) {
  return Array.isArray(row?.routePatterns)
    ? (row.routePatterns as string[]).join("\n")
    : "";
}

type SnippetEditorFormProps = {
  initial?: CodeSnippetRow | null;
  canActivate: boolean;
  canDelete: boolean;
};

export function SnippetEditorForm({
  initial,
  canActivate,
  canDelete
}: SnippetEditorFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(
    initial?.lastValidationMessage ?? null
  );
  const [confirmHighRisk, setConfirmHighRisk] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<SnippetFormInput["type"]>(
    (initial?.type as SnippetFormInput["type"]) ?? "custom_css"
  );
  const [status, setStatus] = useState<SnippetFormInput["status"]>(
    (initial?.status as SnippetFormInput["status"]) ?? "draft"
  );
  const [code, setCode] = useState(initial?.code ?? "");
  const [priority, setPriority] = useState(String(initial?.priority ?? 100));
  const [placementMode, setPlacementMode] = useState(
    parsePlacement(initial).mode
  );
  const [pageGroup, setPageGroup] = useState(parsePlacement(initial).pageGroup ?? "");
  const [routePatterns, setRoutePatterns] = useState(parseRoutes(initial));
  const [deviceTarget, setDeviceTarget] = useState<SnippetFormInput["deviceTarget"]>(
    (initial?.deviceTarget as SnippetFormInput["deviceTarget"]) ?? "all"
  );
  const [userTarget, setUserTarget] = useState<SnippetFormInput["userTarget"]>(
    (initial?.userTarget as SnippetFormInput["userTarget"]) ?? "all"
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [changeNote, setChangeNote] = useState("");

  function buildInput(targetStatus?: SnippetFormInput["status"]): SnippetFormInput {
    return {
      name,
      description,
      type,
      status: targetStatus ?? status,
      code,
      priority: Number(priority) || 100,
      placementConfig: {
        mode: placementMode,
        pageGroup: pageGroup || null
      },
      routePatterns: routePatterns
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      surfaceKeys: [],
      deviceTarget,
      userTarget,
      notes,
      changeNote: changeNote || undefined,
      confirmHighRisk
    };
  }

  function runSave(targetStatus?: SnippetFormInput["status"]) {
    setError(null);
    startTransition(async () => {
      const result = await saveSnippetAction({
        ...buildInput(targetStatus),
        id: initial?.id
      });
      if (!result.ok) {
        setError(result.error);
        setValidationMsg(result.validationMessage ?? null);
        return;
      }
      setValidationMsg(result.validationMessage ?? null);
      if (result.id && !initial?.id) {
        router.push(`/admin/developer/snippets/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  async function runValidate() {
    const result = await validateSnippetPreviewAction({
      type,
      code,
      confirmHighRisk
    });
    setValidationMsg(result.message);
    if (result.requiresSuperConfirm) {
      setError("Cần tick xác nhận mẫu rủi ro cao (super admin).");
    }
  }

  const previewHtml =
    type === "safe_html"
      ? sanitizeSnippetHtml(
          looksLikeSnippetHtml(code) ? parseSnippetMarkup(code).bodyHtml : code
        )
      : null;

  const codeHint =
    type === "head_script" ||
    type === "body_start_script" ||
    type === "footer_script"
      ? "Dán JS thuần hoặc HTML <script>/<meta>/<link> (kể cả block Google/Facebook copy sẵn). Meta/link luôn vào <head>."
      : type === "safe_html"
        ? "HTML body; thẻ <meta>/<link> sẽ tách sang <head>. Không dùng <script> ở đây."
        : null;

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
        Không cho phép chạy mã backend từ admin. Chỉ CSS, script frontend và HTML đã sanitize.
      </p>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Tên snippet *</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Loại mã *</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
            onChange={(e) => setType(e.target.value as SnippetFormInput["type"])}
            value={type}
          >
            {SNIPPET_TYPES.map((t) => (
              <option key={t} value={t}>
                {SNIPPET_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm lg:col-span-2">
          <span className="text-zinc-400">Mô tả</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
            onChange={(e) => setDescription(e.target.value)}
            value={description}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Trạng thái</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
            onChange={(e) => setStatus(e.target.value as SnippetFormInput["status"])}
            value={status}
          >
            {SNIPPET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Ưu tiên (số nhỏ chạy trước)</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
            onChange={(e) => setPriority(e.target.value)}
            type="number"
            value={priority}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Vị trí chèn (placement)</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
            onChange={(e) => setPlacementMode(e.target.value as SnippetPlacementConfig["mode"])}
            value={placementMode}
          >
            {PLACEMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {placementMode === "page_group" ? (
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Nhóm trang</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
              onChange={(e) => setPageGroup(e.target.value)}
              placeholder="public, legal, article…"
              value={pageGroup}
            />
          </label>
        ) : null}
        {placementMode === "route" ? (
          <label className="block space-y-1 text-sm lg:col-span-2">
            <span className="text-zinc-400">Route patterns (mỗi dòng một pattern)</span>
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-zinc-100"
              onChange={(e) => setRoutePatterns(e.target.value)}
              placeholder="/bai-viet&#10;/stories/*"
              value={routePatterns}
            />
          </label>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Thiết bị</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
            onChange={(e) =>
              setDeviceTarget(e.target.value as SnippetFormInput["deviceTarget"])
            }
            value={deviceTarget}
          >
            {SNIPPET_DEVICE_TARGETS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Điều kiện người dùng</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
            onChange={(e) => setUserTarget(e.target.value as SnippetFormInput["userTarget"])}
            value={userTarget}
          >
            {SNIPPET_USER_TARGETS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm lg:col-span-2">
          <span className="text-zinc-400">Ghi chú nội bộ</span>
          <textarea
            className="min-h-[60px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100"
            onChange={(e) => setNotes(e.target.value)}
            value={notes}
          />
        </label>
        <label className="block space-y-1 text-sm lg:col-span-2">
          <span className="text-zinc-400">Ghi chú phiên bản (khi lưu)</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-zinc-100"
            onChange={(e) => setChangeNote(e.target.value)}
            value={changeNote}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-400 lg:col-span-2">
          <input
            checked={confirmHighRisk}
            onChange={(e) => setConfirmHighRisk(e.target.checked)}
            type="checkbox"
          />
          Xác nhận mẫu rủi ro cao (cookie/storage/fetch…)
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-zinc-400">Mã / nội dung *</span>
        {codeHint ? <span className="block text-xs text-zinc-500">{codeHint}</span> : null}
        <textarea
          className="min-h-[220px] w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-zinc-100"
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          value={code}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/30 disabled:opacity-50"
          disabled={pending}
          onClick={() => runSave()}
          type="button"
        >
          Lưu
        </button>
        <button
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={() => runValidate()}
          type="button"
        >
          Kiểm tra an toàn
        </button>
        {canActivate ? (
          <button
            className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
            disabled={pending}
            onClick={() => runSave("active")}
            type="button"
          >
            Lưu & kích hoạt
          </button>
        ) : null}
        {initial?.id ? (
          <>
            <button
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setSnippetStatusAction(initial.id, "inactive");
                  router.refresh();
                })
              }
              type="button"
            >
              Tắt snippet
            </button>
            <button
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await duplicateSnippetAction(initial.id);
                  if (r.ok && r.id) router.push(`/admin/developer/snippets/${r.id}`);
                })
              }
              type="button"
            >
              Nhân bản
            </button>
            <Link
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-white/5"
              href={`/admin/developer/snippets/${initial.id}/versions`}
            >
              Lịch sử phiên bản
            </Link>
            {canDelete ? (
              <button
                className="rounded-full border border-rose-400/40 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                disabled={pending}
                onClick={() => {
                  if (!confirm("Lưu trữ (archive) snippet này?")) return;
                  startTransition(async () => {
                    await archiveSnippetAction(initial.id);
                    router.push("/admin/developer/snippets");
                  });
                }}
                type="button"
              >
                Xoá / lưu trữ
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {validationMsg ? (
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-zinc-300">Kiểm tra an toàn:</span> {validationMsg}
        </p>
      ) : null}

      {previewHtml !== null ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Preview HTML (đã sanitize)
          </p>
          <div
            className="prose prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      ) : type === "custom_css" && code.trim() ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Preview CSS (scoped demo)
          </p>
          <style dangerouslySetInnerHTML={{ __html: code }} />
          <p className="mt-2 text-sm text-zinc-400" data-snippet-preview>
            Đoạn demo — CSS áp dụng khi snippet active trên route công khai.
          </p>
        </div>
      ) : null}
    </div>
  );
}
