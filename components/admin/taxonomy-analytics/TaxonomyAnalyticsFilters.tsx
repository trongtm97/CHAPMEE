import { Button } from "@/components/ui";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import type { TaxonomyAnalyticsPageData } from "@/types/taxonomy-analytics";

const SURFACES = [
  "all",
  "discover",
  "search",
  "reels",
  "ranking",
  "taxonomy_page",
  "profile"
] as const;

type FilterDraft = {
  from: string;
  to: string;
  type: string;
  surface: TaxonomyAnalyticsPageData["filters"]["surface"];
  term: string;
  creator: string;
  monetization: string;
  completionMinStarts: string;
  completionMinImpressions: string;
  completionMinStories: string;
};

type TaxonomyAnalyticsFiltersProps = {
  data: TaxonomyAnalyticsPageData;
  draft: FilterDraft;
  advanced: boolean;
  chips: string[];
  pending: boolean;
  canRebuild: boolean;
  setAdvanced: (next: boolean) => void;
  setDraft: (updater: (prev: FilterDraft) => FilterDraft) => void;
  onApply: () => void;
  onReset: () => void;
  onRefresh: () => void;
};

export function TaxonomyAnalyticsFilters({
  data,
  draft,
  advanced,
  chips,
  pending,
  canRebuild,
  setAdvanced,
  setDraft,
  onApply,
  onReset,
  onRefresh
}: TaxonomyAnalyticsFiltersProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
        Bộ lọc phân tích
      </h3>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <label className="text-sm">
          <span className="text-zinc-400">Từ ngày</span>
          <input
            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
            onChange={(e) => setDraft((s) => ({ ...s, from: e.target.value }))}
            type="date"
            value={draft.from}
          />
        </label>
        <label className="text-sm">
          <span className="text-zinc-400">Đến ngày</span>
          <input
            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
            onChange={(e) => setDraft((s) => ({ ...s, to: e.target.value }))}
            type="date"
            value={draft.to}
          />
        </label>
        <label className="text-sm">
          <span className="text-zinc-400">Nhóm taxonomy</span>
          <select
            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
            onChange={(e) => setDraft((s) => ({ ...s, type: e.target.value }))}
            value={draft.type}
          >
            <option value="all">Tất cả</option>
            {data.typeOptions.map((type) => (
              <option key={type} value={type}>
                {TAXONOMY_TYPE_LABELS[type as keyof typeof TAXONOMY_TYPE_LABELS] ?? type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-zinc-400">Surface</span>
          <select
            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
            onChange={(e) =>
              setDraft((s) => ({ ...s, surface: e.target.value as typeof s.surface }))
            }
            value={draft.surface}
          >
            {SURFACES.map((surface) => (
              <option key={surface} value={surface}>
                {surface}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        className="mt-3 text-sm text-cyan-300 hover:text-cyan-200"
        onClick={() => setAdvanced(!advanced)}
        type="button"
      >
        {advanced ? "Ẩn filter nâng cao" : "Mở filter nâng cao"}
      </button>
      {advanced ? (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="text-zinc-400">Term cụ thể</span>
            <select
              className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              onChange={(e) => setDraft((s) => ({ ...s, term: e.target.value }))}
              value={draft.term}
            >
              <option value="">Tất cả</option>
              {data.termOptions.slice(0, 300).map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Creator</span>
            <select
              className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              onChange={(e) => setDraft((s) => ({ ...s, creator: e.target.value }))}
              value={draft.creator}
            >
              <option value="">Tất cả</option>
              {data.creatorOptions.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Monetization</span>
            <select
              className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              onChange={(e) => setDraft((s) => ({ ...s, monetization: e.target.value }))}
              value={draft.monetization}
            >
              <option value="">Tất cả</option>
              {data.monetizationOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Min starts (completion)</span>
            <input
              className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              onChange={(e) =>
                setDraft((s) => ({ ...s, completionMinStarts: e.target.value }))
              }
              type="number"
              value={draft.completionMinStarts}
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Min impressions</span>
            <input
              className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              onChange={(e) =>
                setDraft((s) => ({ ...s, completionMinImpressions: e.target.value }))
              }
              type="number"
              value={draft.completionMinImpressions}
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Min stories</span>
            <input
              className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              onChange={(e) =>
                setDraft((s) => ({ ...s, completionMinStories: e.target.value }))
              }
              type="number"
              value={draft.completionMinStories}
            />
          </label>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onApply}>Áp dụng</Button>
        <Button onClick={onReset} variant="secondary">
          Reset
        </Button>
        <Button disabled={!canRebuild || pending} onClick={onRefresh} variant="ghost">
          Làm mới metrics
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
          >
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}
