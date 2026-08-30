"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PolicyPageEditor } from "@/components/admin/policies/PolicyPageEditor";
import { PolicyStatusBadge } from "@/components/admin/policies/PolicyStatusBadge";
import { Button } from "@/components/ui";
import {
  archivePolicyPageAction,
  listPolicyVersionsAction,
  publishPolicyPageAction,
  savePolicyPageAction
} from "@/lib/admin/policy-actions";
import { slugifyVietnameseTitle } from "@/lib/platform-content/slug";
import { getPolicyUrl } from "@/lib/urls/paths";
import {
  POLICY_TYPES,
  POLICY_TYPE_LABELS,
  type AdminPolicyCapabilities,
  type PolicyPage,
  type PolicyVersion
} from "@/types/policy-pages";

type Props = {
  item?: PolicyPage | null;
  capabilities: AdminPolicyCapabilities;
  initialTab?: "edit" | "versions";
};

export function PolicyForm({ item, capabilities, initialTab = "edit" }: Props) {
  const router = useRouter();
  const isEdit = Boolean(item);
  const [tab, setTab] = useState<"edit" | "versions">(initialTab);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [versionsLoaded, setVersionsLoaded] = useState(false);

  const [title, setTitle] = useState(item?.title ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [policyType, setPolicyType] = useState(item?.policy_type ?? "content");
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [content, setContent] = useState(item?.content ?? "");
  const [effectiveDate, setEffectiveDate] = useState(item?.effective_date ?? "");
  const [seoTitle, setSeoTitle] = useState(item?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(item?.seo_description ?? "");
  const [seoIndexable, setSeoIndexable] = useState(item?.seo_indexable ?? true);
  const [publicPath, setPublicPath] = useState(item?.canonical_path ?? "");
  const [changeNote, setChangeNote] = useState("");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  function loadVersions() {
    if (!item || versionsLoaded) return;
    startTransition(async () => {
      const result = await listPolicyVersionsAction(item.id);
      if (!result.error) {
        setVersions(result.items);
        setVersionsLoaded(true);
      }
    });
  }

  function handleSaveDraft() {
    startTransition(async () => {
      setError(null);
      const result = await savePolicyPageAction({
        id: item?.id,
        data: {
          title: title.trim(),
          slug: slug.trim(),
          policy_type: policyType,
          summary: summary.trim() || null,
          content,
          status: "draft",
          effective_date: effectiveDate || null,
          seo_title: seoTitle.trim() || null,
          seo_description: seoDescription.trim() || null,
          seo_indexable: seoIndexable,
          canonical_path: publicPath.trim() || null
        }
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      showToast("Đã lưu bản nháp.");
      if (!isEdit && result.item) {
        router.push(`/admin/pages/${result.item.id}/edit`);
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      setError(null);
      const saveResult = await savePolicyPageAction({
        id: item?.id,
        data: {
          title: title.trim(),
          slug: slug.trim(),
          policy_type: policyType,
          summary: summary.trim() || null,
          content,
          effective_date: effectiveDate || null,
          seo_title: seoTitle.trim() || null,
          seo_description: seoDescription.trim() || null,
          seo_indexable: seoIndexable,
          canonical_path: publicPath.trim() || null,
          change_note: changeNote.trim() || null
        }
      });
      if (saveResult.error) {
        setError(saveResult.error);
        return;
      }
      const policyId = saveResult.item?.id ?? item?.id;
      if (!policyId) return;
      const publishResult = await publishPolicyPageAction(policyId, changeNote.trim() || null);
      if (publishResult.error) {
        setError(publishResult.error);
        return;
      }
      showToast("Đã xuất bản trang.");
      router.refresh();
    });
  }

  function handleArchive() {
    if (!item) return;
    startTransition(async () => {
      const result = await archivePolicyPageAction(item.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      showToast("Đã lưu trữ.");
      router.push("/admin/pages");
    });
  }

  const previewUrl =
    item?.status === "published"
      ? publicPath.trim() ||
        item.canonical_path ||
        (item.public_code != null
          ? getPolicyUrl({ slug: item.slug, public_code: item.public_code })
          : null)
      : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm text-zinc-400 hover:text-white" href="/admin/pages">
            ← Quản lý trang
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-white">
            {isEdit ? "Sửa trang" : "Tạo trang"}
          </h1>
          {item ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PolicyStatusBadge status={item.status} />
              <span className="text-sm text-zinc-400">v{item.version}</span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {previewUrl ? (
            <Link
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200"
              href={previewUrl}
              target="_blank"
            >
              Xem public
            </Link>
          ) : null}
        </div>
      </header>

      {isEdit ? (
        <div className="flex gap-2 border-b border-white/10 pb-2">
          <button
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === "edit" ? "bg-white/10 text-white" : "text-zinc-400"}`}
            onClick={() => setTab("edit")}
            type="button"
          >
            Nội dung
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === "versions" ? "bg-white/10 text-white" : "text-zinc-400"}`}
            onClick={() => {
              setTab("versions");
              loadVersions();
            }}
            type="button"
          >
            Versions
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {toast ? (
        <p className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
          {toast}
        </p>
      ) : null}

      {tab === "versions" && item ? (
        <div className="space-y-3">
          {versions.length === 0 ? (
            <p className="text-sm text-zinc-400">Chưa có version history.</p>
          ) : (
            versions.map((version) => (
              <div className="rounded-xl border border-white/10 p-4" key={version.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">
                    v{version.version} — {version.title}
                  </p>
                  <time className="text-xs text-zinc-500">
                    {new Date(version.created_at).toLocaleString("vi-VN")}
                  </time>
                </div>
                {version.change_note ? (
                  <p className="mt-2 text-sm text-zinc-400">{version.change_note}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Tiêu đề</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (!isEdit && !slug) {
                    setSlug(slugifyVietnameseTitle(event.target.value));
                  }
                }}
                value={title}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Slug (CMS)</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                onChange={(event) => setSlug(event.target.value)}
                value={slug}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">URL public</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-sm text-white"
                onChange={(event) => setPublicPath(event.target.value)}
                placeholder="/legal/terms, /about, /chinh-sach/..."
                value={publicPath}
              />
              <p className="text-xs text-zinc-500">
                Đường dẫn người dùng truy cập. Trang hệ thống nên dùng đúng path trong danh mục.
              </p>
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Policy type</span>
              <select
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                onChange={(event) => setPolicyType(event.target.value as typeof policyType)}
                value={policyType}
              >
                {POLICY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {POLICY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Summary</span>
              <textarea
                className="min-h-20 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                onChange={(event) => setSummary(event.target.value)}
                value={summary}
              />
            </label>
            <div className="space-y-1 lg:col-span-2">
              <span className="block text-sm text-zinc-300">Nội dung trang</span>
              <PolicyPageEditor
                disabled={!capabilities.canEdit}
                onChange={setContent}
                value={content}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Effective date</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                onChange={(event) => setEffectiveDate(event.target.value)}
                type="date"
                value={effectiveDate}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">SEO title</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                onChange={(event) => setSeoTitle(event.target.value)}
                value={seoTitle}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">SEO description</span>
              <textarea
                className="min-h-20 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                onChange={(event) => setSeoDescription(event.target.value)}
                value={seoDescription}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={seoIndexable}
                onChange={(event) => setSeoIndexable(event.target.checked)}
                type="checkbox"
              />
              SEO indexable
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-zinc-300">Change note (khi publish)</span>
              <textarea
                className="min-h-16 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                onChange={(event) => setChangeNote(event.target.value)}
                placeholder="Mô tả thay đổi trong version mới..."
                value={changeNote}
              />
            </label>

            <div className="flex flex-col gap-2 pt-2">
              {capabilities.canEdit ? (
                <Button disabled={pending} onClick={handleSaveDraft} type="button" variant="secondary">
                  Save draft
                </Button>
              ) : null}
              {capabilities.canPublish ? (
                <Button disabled={pending} onClick={handlePublish} type="button">
                  Publish
                </Button>
              ) : null}
              {capabilities.canPublish && item?.status === "published" ? (
                <Button disabled={pending} onClick={handleArchive} type="button" variant="ghost">
                  Archive
                </Button>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
