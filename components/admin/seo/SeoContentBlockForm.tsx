"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import {
  deleteSeoContentBlockAction,
  saveSeoContentBlockAction,
  setSeoContentBlockStatusAction
} from "@/lib/admin/seo-content-actions";
import type { SeoContentBlockRow } from "@/lib/db/schema/seo-center";
import { detectSeoMarkdownH1Warnings } from "@/lib/seo/markdown-sanitize";
import {
  SEO_CONTENT_STATUSES,
  SEO_PAGE_TYPES,
  SEO_TARGET_TYPES
} from "@/lib/seo/seo-constants";
import type { SeoContentFaqItem, SeoContentInternalLink } from "@/lib/seo/seo-types";

type SeoContentBlockFormProps = {
  initial?: SeoContentBlockRow | null;
  canUpdate: boolean;
  defaultRoutePath?: string;
  defaultPageType?: string;
};

const EMPTY_FAQ: SeoContentFaqItem = { question: "", answer: "" };
const EMPTY_LINK: SeoContentInternalLink = { label: "", url: "", note: "" };

function parseFaq(value: unknown): SeoContentFaqItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ ...EMPTY_FAQ }];
  }
  return value.map((item) => ({
    question: String((item as SeoContentFaqItem).question ?? ""),
    answer: String((item as SeoContentFaqItem).answer ?? "")
  }));
}

function parseLinks(value: unknown): SeoContentInternalLink[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ ...EMPTY_LINK }];
  }
  return value.map((item) => ({
    label: String((item as SeoContentInternalLink).label ?? ""),
    url: String((item as SeoContentInternalLink).url ?? ""),
    note: String((item as SeoContentInternalLink).note ?? "")
  }));
}

export function SeoContentBlockForm({
  initial,
  canUpdate,
  defaultRoutePath = "",
  defaultPageType
}: SeoContentBlockFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    pageType: initial?.pageType ?? defaultPageType ?? "story_catalog",
    targetType: initial?.targetType ?? "",
    targetId: initial?.targetId ?? "",
    routePath: initial?.routePath ?? defaultRoutePath ?? "",
    locale: initial?.locale ?? "vi",
    title: initial?.title ?? "",
    summary: initial?.summary ?? "",
    contentMarkdown: initial?.contentMarkdown ?? "",
    faq: parseFaq(initial?.faqJson),
    internalLinks: parseLinks(initial?.internalLinksJson),
    isCollapsible: initial?.isCollapsible ?? true,
    status: initial?.status ?? "draft"
  });
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const markdownWarnings = useMemo(
    () => detectSeoMarkdownH1Warnings(form.contentMarkdown),
    [form.contentMarkdown]
  );

  function cleanFaq(items: SeoContentFaqItem[]) {
    return items.filter((item) => item.question.trim() && item.answer.trim());
  }

  function cleanLinks(items: SeoContentInternalLink[]) {
    return items
      .filter((item) => item.label.trim() && item.url.trim())
      .map((item) => ({
        label: item.label.trim(),
        url: item.url.trim(),
        ...(item.note?.trim() ? { note: item.note.trim() } : {})
      }));
  }

  function submit(statusOverride?: string) {
    setMessage(null);
    setFieldErrors({});

    const status = statusOverride ?? form.status;

    startTransition(async () => {
      const result = await saveSeoContentBlockAction({
        id: initial?.id,
        pageType: form.pageType,
        targetType: form.targetType.trim() || null,
        targetId: form.targetId.trim() || null,
        routePath: form.routePath.trim() || null,
        locale: form.locale,
        title: form.title,
        summary: form.summary || null,
        contentMarkdown: form.contentMarkdown,
        faqJson: cleanFaq(form.faq),
        internalLinksJson: cleanLinks(form.internalLinks),
        isCollapsible: form.isCollapsible,
        status: status as "draft" | "published" | "archived"
      });

      setOk(result.ok);
      setMessage(result.message ?? "");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      if (result.ok && result.id && !initial?.id) {
        router.push(`/admin/seo/content-blocks/${result.id}`);
      }
    });
  }

  function onPublish() {
    submit("published");
  }

  function onArchive() {
    if (!initial?.id) {
      return;
    }
    startTransition(async () => {
      const result = await setSeoContentBlockStatusAction(initial.id, "archived");
      setOk(result.ok);
      setMessage(result.message ?? "");
      if (result.ok) {
        setForm((prev) => ({ ...prev, status: "archived" }));
      }
    });
  }

  function onDelete() {
    if (!initial?.id || !window.confirm("Xóa content block này?")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteSeoContentBlockAction(initial.id);
      setMessage(result.message ?? "");
      if (result.ok) {
        router.push("/admin/seo/content-blocks");
      }
    });
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-300">Page type</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => setForm((prev) => ({ ...prev, pageType: event.target.value }))}
            value={form.pageType}
          >
            {SEO_PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {fieldErrors.pageType ? (
            <span className="text-xs text-red-300">{fieldErrors.pageType}</span>
          ) : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-300">Status</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            value={form.status}
          >
            {SEO_CONTENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-300">Target type (optional)</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => setForm((prev) => ({ ...prev, targetType: event.target.value }))}
            value={form.targetType}
          >
            <option value="">—</option>
            {SEO_TARGET_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Target ID"
          onChange={(event) => setForm((prev) => ({ ...prev, targetId: event.target.value }))}
          value={form.targetId}
        />
        <Input
          label="Locale"
          onChange={(event) => setForm((prev) => ({ ...prev, locale: event.target.value }))}
          value={form.locale}
        />
      </div>

      <Input
        error={fieldErrors.routePath}
        label="Route path (ưu tiên cao nhất khi publish)"
        onChange={(event) => setForm((prev) => ({ ...prev, routePath: event.target.value }))}
        placeholder="/truyen"
        value={form.routePath}
      />

      <Input
        error={fieldErrors.title}
        label="Title (render H2 trên public)"
        onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        required
        value={form.title}
      />

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-300">Summary</span>
        <textarea
          className="min-h-[72px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
          value={form.summary}
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-300">Content markdown</span>
        <textarea
          className="min-h-[200px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-sm text-white"
          onChange={(event) =>
            setForm((prev) => ({ ...prev, contentMarkdown: event.target.value }))
          }
          placeholder="## Tiêu đề phụ&#10;&#10;Đoạn giới thiệu ngắn, dùng H2/H3/H4 — không dùng # H1."
          value={form.contentMarkdown}
        />
        {fieldErrors.contentMarkdown ? (
          <span className="text-xs text-red-300">{fieldErrors.contentMarkdown}</span>
        ) : null}
        {markdownWarnings.map((warning) => (
          <span className="block text-xs text-amber-200" key={warning}>
            ⚠ {warning}
          </span>
        ))}
      </label>

      <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">FAQ</h3>
          <Button
            onClick={() => setForm((prev) => ({ ...prev, faq: [...prev.faq, { ...EMPTY_FAQ }] }))}
            type="button"
            variant="secondary"
          >
            + Câu hỏi
          </Button>
        </div>
        {form.faq.map((item, index) => (
          <div className="grid gap-2 sm:grid-cols-2" key={`faq-${index}`}>
            <Input
              label="Question"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  faq: prev.faq.map((row, i) =>
                    i === index ? { ...row, question: event.target.value } : row
                  )
                }))
              }
              value={item.question}
            />
            <Input
              label="Answer"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  faq: prev.faq.map((row, i) =>
                    i === index ? { ...row, answer: event.target.value } : row
                  )
                }))
              }
              value={item.answer}
            />
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">Internal links</h3>
          <Button
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                internalLinks: [...prev.internalLinks, { ...EMPTY_LINK }]
              }))
            }
            type="button"
            variant="secondary"
          >
            + Link
          </Button>
        </div>
        {fieldErrors.internalLinksJson ? (
          <p className="text-xs text-red-300">{fieldErrors.internalLinksJson}</p>
        ) : null}
        {form.internalLinks.map((item, index) => (
          <div className="grid gap-2 sm:grid-cols-3" key={`link-${index}`}>
            <Input
              label="Label"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  internalLinks: prev.internalLinks.map((row, i) =>
                    i === index ? { ...row, label: event.target.value } : row
                  )
                }))
              }
              value={item.label}
            />
            <Input
              label="URL"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  internalLinks: prev.internalLinks.map((row, i) =>
                    i === index ? { ...row, url: event.target.value } : row
                  )
                }))
              }
              placeholder="/discover"
              value={item.url}
            />
            <Input
              label="Note (optional)"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  internalLinks: prev.internalLinks.map((row, i) =>
                    i === index ? { ...row, note: event.target.value } : row
                  )
                }))
              }
              value={item.note ?? ""}
            />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          checked={form.isCollapsible}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, isCollapsible: event.target.checked }))
          }
          type="checkbox"
        />
        Collapsible trên mobile (details/summary — user mở được)
      </label>

      {message ? (
        <p className={`text-sm ${ok ? "text-emerald-300" : "text-red-300"}`}>{message}</p>
      ) : null}

      {canUpdate ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => submit()} type="button">
            {pending ? "Đang lưu…" : initial?.id ? "Lưu nháp" : "Tạo block"}
          </Button>
          <Button disabled={pending} onClick={onPublish} type="button" variant="secondary">
            Publish
          </Button>
          {initial?.id && form.status !== "archived" ? (
            <Button disabled={pending} onClick={onArchive} type="button" variant="secondary">
              Archive
            </Button>
          ) : null}
          {initial?.id ? (
            <Button disabled={pending} onClick={onDelete} type="button" variant="secondary">
              Xóa
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Bạn chỉ có quyền xem.</p>
      )}
    </Card>
  );
}
