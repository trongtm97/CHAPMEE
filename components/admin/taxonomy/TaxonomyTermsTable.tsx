"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import { Button, Input } from "@/components/ui";
import { TaxonomyMergeModal } from "@/components/admin/taxonomy/TaxonomyMergeModal";
import { TaxonomyPagination } from "@/components/admin/taxonomy/TaxonomyPagination";
import { TaxonomyStoriesModal } from "@/components/admin/taxonomy/TaxonomyStoriesModal";
import { TaxonomyTermFormModal } from "@/components/admin/taxonomy/TaxonomyTermFormModal";
import {
  deleteTaxonomyTermAdminAction,
  listTaxonomyTermsAdminAction,
  toggleTaxonomyTermActiveAction
} from "@/lib/admin/taxonomy-actions";
import {
  TAXONOMY_ADMIN_PAGE_SIZE,
  type TaxonomyTermSort,
  type TaxonomyTermStatusFilter,
  type TaxonomyUsageFilter
} from "@/lib/taxonomy/admin-tabs";
import type { TaxonomyTermAdminRow } from "@/lib/taxonomy/admin-data";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import { taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";
import type { TaxonomyType } from "@/types/taxonomy";
import { useLatestRequestGuard } from "@/hooks/useLatestRequestGuard";

function Flag({ on }: { on: boolean }) {
  return (
    <span className={on ? "text-emerald-400" : "text-zinc-600"} title={on ? "CÃ³" : "KhÃ´ng"}>
      {on ? "âœ“" : "â€”"}
    </span>
  );
}

function termStatusLabel(term: TaxonomyTermAdminRow) {
  if (term.is_active) return "Active";
  if (term.usage_count > 0) return "Deprecated";
  return "Disabled";
}

function statusFilterToQuery(status: TaxonomyTermStatusFilter) {
  if (status === "active") return { activeOnly: true };
  if (status === "disabled") return { inactiveOnly: true };
  if (status === "deprecated") return { deprecatedOnly: true };
  return {};
}

function usageFilterToQuery(usage: TaxonomyUsageFilter) {
  if (usage === "unused") return { usageMax: 0 };
  if (usage === "low") return { usageMin: 1, usageMax: 5 };
  if (usage === "high") return { usageMin: 100 };
  return {};
}

type TaxonomyTermsTableProps = {
  groupFilter?: TaxonomyType | "all";
  createNonce?: number;
  focusTermId?: string | null;
  selectedId?: string | null;
  actionRequest?: {
    type: "edit" | "merge" | "stories" | "toggle";
    term: TaxonomyTermAdminRow;
  } | null;
  onActionRequestHandled?: () => void;
  onSelect?: (term: TaxonomyTermAdminRow) => void;
  onMessage: TaxonomyAdminNotify;
  onStatsRefresh?: () => void;
};

export function TaxonomyTermsTable({
  groupFilter = "all",
  createNonce = 0,
  focusTermId,
  selectedId,
  actionRequest,
  onActionRequestHandled,
  onSelect,
  onMessage,
  onStatsRefresh
}: TaxonomyTermsTableProps) {
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaxonomyTermStatusFilter>("all");
  const [usageFilter, setUsageFilter] = useState<TaxonomyUsageFilter>("all");
  const [sort, setSort] = useState<TaxonomyTermSort>("updated_desc");
  const [creatorOnly, setCreatorOnly] = useState(false);
  const [discoverOnly, setDiscoverOnly] = useState(false);
  const [seoOnly, setSeoOnly] = useState(false);
  const [rankingOnly, setRankingOnly] = useState(false);
  const [moderationOnly, setModerationOnly] = useState(false);
  const [presentationOnly, setPresentationOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TaxonomyTermAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [editTerm, setEditTerm] = useState<TaxonomyTermAdminRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<TaxonomyTermAdminRow | null>(null);
  const [storiesTerm, setStoriesTerm] = useState<TaxonomyTermAdminRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TaxonomyTermAdminRow | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<{
    term: TaxonomyTermAdminRow;
    nextActive: boolean;
    description: string;
  } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const searchTimerRef = useRef<number | null>(null);
  const requestGuard = useLatestRequestGuard();

  const totalPages = Math.max(1, Math.ceil(total / TAXONOMY_ADMIN_PAGE_SIZE));
  const defaultType = groupFilter === "all" ? "main_genre" : groupFilter;

  const load = useCallback(() => {
    const requestId = requestGuard.nextRequestId();
    startTransition(async () => {
      const result = await listTaxonomyTermsAdminAction({
        ...(groupFilter !== "all" ? { type: groupFilter } : {}),
        search: search.trim() || undefined,
        ...statusFilterToQuery(statusFilter),
        ...usageFilterToQuery(usageFilter),
        creatorSelectable: creatorOnly || undefined,
        discoverOnly: discoverOnly || undefined,
        seoOnly: seoOnly || undefined,
        rankingOnly: rankingOnly || undefined,
        moderationOnly: moderationOnly || undefined,
        presentationOnly: presentationOnly || undefined,
        sort,
        page,
        pageSize: TAXONOMY_ADMIN_PAGE_SIZE
      });
      if (!requestGuard.onlyLatest(requestId)) {
        return;
      }
      setItems(result.items);
      setTotal(result.total);
      if (result.error) onMessage(result.error);
    });
  }, [
    creatorOnly,
    discoverOnly,
    groupFilter,
    moderationOnly,
    onMessage,
    page,
    presentationOnly,
    rankingOnly,
    search,
    seoOnly,
    sort,
    statusFilter,
    usageFilter,
    requestGuard
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPage(1));
    return () => window.cancelAnimationFrame(frame);
  }, [groupFilter, statusFilter, usageFilter, sort, creatorOnly, discoverOnly, seoOnly, rankingOnly, moderationOnly, presentationOnly]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (createNonce <= 0) return;
    const frame = window.requestAnimationFrame(() => setCreateOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [createNonce]);

  useEffect(() => {
    if (!focusTermId || items.length === 0) return;
    const found = items.find((t) => t.id === focusTermId);
    if (found) onSelect?.(found);
  }, [focusTermId, items, onSelect]);

  const runToggle = useCallback((term: TaxonomyTermAdminRow, nextActive: boolean) => {
    startTransition(async () => {
      const result = await toggleTaxonomyTermActiveAction(term.id, nextActive);
      if (result.error) {
        onMessage(result.error);
        return;
      }
      onMessage(nextActive ? "Da bat taxonomy." : "Da tat taxonomy.", "success");
      load();
      onStatsRefresh?.();
    });
  }, [load, onMessage, onStatsRefresh]);

  const requestToggle = useCallback((term: TaxonomyTermAdminRow, nextActive: boolean) => {
    if (!nextActive) {
      const parts: string[] = [];
      if (term.usage_count > 0) parts.push(`${term.usage_count} truyá»‡n Ä‘ang dÃ¹ng.`);
      if (term.use_for_seo || term.use_for_discover) {
        parts.push("áº¢nh hÆ°á»Ÿng SEO/Discover.");
      }
      if (parts.length > 0) {
        setToggleConfirm({ term, nextActive, description: parts.join("\n") });
        return;
      }
    }
    runToggle(term, nextActive);
  }, [runToggle]);


  useEffect(() => {
    if (!actionRequest) return;
    const { type, term } = actionRequest;
    const frame = window.requestAnimationFrame(() => {
      if (type === "edit") setEditTerm(term);
      else if (type === "merge") setMergeSource(term);
      else if (type === "stories") setStoriesTerm(term);
      else if (type === "toggle") requestToggle(term, !term.is_active);
      onActionRequestHandled?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [actionRequest, onActionRequestHandled, requestToggle]);

  const empty = !pending && items.length === 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex flex-1 flex-wrap gap-2">
            <Input
              className="min-w-[200px] flex-1"
              onChange={(e) => {
                const nextValue = e.target.value;
                setSearchDraft(nextValue);
                if (searchTimerRef.current) {
                  window.clearTimeout(searchTimerRef.current);
                }
                searchTimerRef.current = window.setTimeout(() => {
                  setSearch(nextValue.trim());
                  setPage(1);
                }, 350);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchDraft);
                  setPage(1);
                }
              }}
              placeholder="TÃ¬m tÃªn, slug, aliasâ€¦"
              value={searchDraft}
            />
            <Button
              onClick={() => {
                setSearch(searchDraft);
                setPage(1);
              }}
              type="button"
              variant="secondary"
            >
              TÃ¬m
            </Button>
            <select
              className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
              onChange={(e) => setSort(e.target.value as TaxonomyTermSort)}
              value={sort}
            >
              <option value="updated_desc">Má»›i cáº­p nháº­t</option>
              <option value="usage_desc">Usage cao</option>
              <option value="usage_asc">Usage tháº¥p</option>
              <option value="name_asc">A-Z</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setFiltersOpen((v) => !v)}
              type="button"
              variant="secondary"
            >
              {filtersOpen ? "áº¨n lá»c" : "Bá»™ lá»c"}
            </Button>
            <Button disabled={pending} onClick={() => load()} type="button" variant="secondary">
              LÃ m má»›i
            </Button>
            <Button onClick={() => setCreateOpen(true)} type="button">
              ThÃªm
            </Button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
            <select
              className="min-h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
              onChange={(e) => setStatusFilter(e.target.value as TaxonomyTermStatusFilter)}
              value={statusFilter}
            >
              <option value="all">Má»i tráº¡ng thÃ¡i</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="deprecated">Deprecated</option>
            </select>
            <select
              className="min-h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
              onChange={(e) => setUsageFilter(e.target.value as TaxonomyUsageFilter)}
              value={usageFilter}
            >
              <option value="all">Má»i usage</option>
              <option value="unused">ChÆ°a dÃ¹ng</option>
              <option value="low">Ãt dÃ¹ng (1â€“5)</option>
              <option value="high">Nhiá»u dÃ¹ng (100+)</option>
            </select>
            <label className="flex items-center gap-1.5 rounded-lg border border-white/5 px-2 text-xs text-zinc-400">
              <input checked={creatorOnly} onChange={(e) => setCreatorOnly(e.target.checked)} type="checkbox" />
              Creator
            </label>
            <label className="flex items-center gap-1.5 rounded-lg border border-white/5 px-2 text-xs text-zinc-400">
              <input checked={discoverOnly} onChange={(e) => setDiscoverOnly(e.target.checked)} type="checkbox" />
              Discover
            </label>
            <label className="flex items-center gap-1.5 rounded-lg border border-white/5 px-2 text-xs text-zinc-400">
              <input checked={seoOnly} onChange={(e) => setSeoOnly(e.target.checked)} type="checkbox" />
              SEO
            </label>
            <label className="flex items-center gap-1.5 rounded-lg border border-white/5 px-2 text-xs text-zinc-400">
              <input checked={rankingOnly} onChange={(e) => setRankingOnly(e.target.checked)} type="checkbox" />
              Ranking
            </label>
            <label className="flex items-center gap-1.5 rounded-lg border border-white/5 px-2 text-xs text-zinc-400">
              <input
                checked={moderationOnly}
                onChange={(e) => setModerationOnly(e.target.checked)}
                type="checkbox"
              />
              Moderation
            </label>
            <label className="flex items-center gap-1.5 rounded-lg border border-white/5 px-2 text-xs text-zinc-400">
              <input
                checked={presentationOnly}
                onChange={(e) => setPresentationOnly(e.target.checked)}
                type="checkbox"
              />
              Composer format
            </label>
          </div>
        ) : null}
      </div>

      {empty ? (
        <div className="rounded-xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-zinc-500">
          KhÃ´ng cÃ³ taxonomy phÃ¹ há»£p bá»™ lá»c. Thá»­ Ä‘á»•i nhÃ³m hoáº·c thÃªm má»¥c má»›i.
        </div>
      ) : (
        <div
          className={`overflow-x-auto rounded-xl border border-white/10 transition-opacity ${pending ? "opacity-60" : ""}`}
        >
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2.5">TÃªn hiá»ƒn thá»‹</th>
                <th className="px-3 py-2.5">Slug</th>
                {groupFilter === "all" ? <th className="px-3 py-2.5">NhÃ³m</th> : null}
                <th className="px-3 py-2.5">Tráº¡ng thÃ¡i</th>
                <th className="px-3 py-2.5">Cr</th>
                <th className="px-3 py-2.5">Dis</th>
                <th className="px-3 py-2.5">SEO</th>
                <th className="px-3 py-2.5">Rank</th>
                <th className="px-3 py-2.5">Usage</th>
                <th className="px-3 py-2.5">Cáº­p nháº­t</th>
                <th className="px-3 py-2.5">HÃ nh Ä‘á»™ng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((term) => {
                const selected = selectedId === term.id;
                const publicUrl = taxonomyTermPublicUrl(term.type, term.slug, term.is_public);
                return (
                  <tr
                    className={`cursor-pointer text-zinc-200 transition hover:bg-white/[0.03] ${selected ? "bg-cyan-400/5" : ""}`}
                    key={term.id}
                    onClick={() => onSelect?.(term)}
                  >
                    <td className="px-3 py-2 font-medium text-white">
                      {term.name}
                      {publicUrl ? (
                        <Link
                          className="ml-2 text-xs font-normal text-cyan-300 hover:underline"
                          href={publicUrl}
                          onClick={(e) => e.stopPropagation()}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          â†—
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">{term.slug}</td>
                    {groupFilter === "all" ? (
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {TAXONOMY_TYPE_LABELS[term.type]}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-xs">{termStatusLabel(term)}</td>
                    <td className="px-3 py-2">
                      <Flag on={term.is_selectable_by_creator} />
                    </td>
                    <td className="px-3 py-2">
                      <Flag on={term.use_for_discover} />
                    </td>
                    <td className="px-3 py-2">
                      <Flag on={term.use_for_seo} />
                    </td>
                    <td className="px-3 py-2">
                      <Flag on={term.use_for_ranking} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">{term.usage_count}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {new Date(term.updated_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        <button
                          className="text-xs text-cyan-300 hover:underline"
                          onClick={() => setEditTerm(term)}
                          type="button"
                        >
                          Sá»­a
                        </button>
                        <button
                          className="text-xs text-zinc-400 hover:underline"
                          onClick={() => requestToggle(term, !term.is_active)}
                          type="button"
                        >
                          {term.is_active ? "Táº¯t" : "Báº­t"}
                        </button>
                        <button
                          className="text-xs text-zinc-400 hover:underline"
                          onClick={() => setMergeSource(term)}
                          type="button"
                        >
                          Gá»™p
                        </button>
                        <button
                          className="text-xs text-zinc-400 hover:underline"
                          onClick={() => setStoriesTerm(term)}
                          type="button"
                        >
                          Truyá»‡n
                        </button>
                        {term.usage_count === 0 ? (
                          <button
                            className="text-xs text-red-400 hover:underline"
                            onClick={() => setDeleteConfirm(term)}
                            type="button"
                          >
                            XÃ³a
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TaxonomyPagination
        onPageChange={setPage}
        page={page}
        pending={pending}
        total={total}
        totalPages={totalPages}
      />

      <TaxonomyTermFormModal
        defaultType={defaultType}
        onClose={() => setCreateOpen(false)}
        onMessage={onMessage}
        onSaved={() => {
          load();
          onStatsRefresh?.();
        }}
        open={createOpen}
        term={null}
      />
      <TaxonomyTermFormModal
        onClose={() => setEditTerm(null)}
        onMessage={onMessage}
        onSaved={() => {
          load();
          onStatsRefresh?.();
        }}
        open={Boolean(editTerm)}
        term={editTerm}
      />
      <TaxonomyMergeModal
        onClose={() => setMergeSource(null)}
        onMerged={() => {
          load();
          onStatsRefresh?.();
        }}
        onMessage={onMessage}
        open={Boolean(mergeSource)}
        source={mergeSource}
      />
      <TaxonomyStoriesModal
        onClose={() => setStoriesTerm(null)}
        onMessage={onMessage}
        open={Boolean(storiesTerm)}
        term={storiesTerm}
      />

      <ConfirmActionModal
        confirmLabel="Táº¯t"
        description={
          toggleConfirm ? `Táº¯t "${toggleConfirm.term.name}"?\n\n${toggleConfirm.description}` : ""
        }
        onClose={() => setToggleConfirm(null)}
        onConfirm={() => {
          if (!toggleConfirm) return;
          const { term, nextActive } = toggleConfirm;
          setToggleConfirm(null);
          runToggle(term, nextActive);
        }}
        open={Boolean(toggleConfirm)}
        pending={pending}
        title="Táº¯t taxonomy"
        variant="danger"
      />

      <ConfirmActionModal
        confirmLabel="XÃ³a vÄ©nh viá»…n"
        description={
          deleteConfirm
            ? `XÃ³a "${deleteConfirm.name}"? Chá»‰ dÃ¹ng khi chÆ°a cÃ³ usage.`
            : ""
        }
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (!deleteConfirm) return;
          const id = deleteConfirm.id;
          setDeleteConfirm(null);
          startTransition(async () => {
            const result = await deleteTaxonomyTermAdminAction(id);
            if (result.error || !result.ok) {
              onMessage(result.error ?? "KhÃ´ng xÃ³a Ä‘Æ°á»£c.");
              return;
            }
            onMessage("ÄÃ£ xÃ³a taxonomy.", "success");
            load();
            onStatsRefresh?.();
          });
        }}
        open={Boolean(deleteConfirm)}
        pending={pending}
        title="XÃ³a taxonomy"
        variant="danger"
      />
    </div>
  );
}
