"use client";

import {
  ALGORITHM_CONTROL_TABS,
  type AlgorithmControlTabId
} from "@/types/algorithm-settings";

const SECTION_LABELS: Record<string, string> = {
  overview: "Tổng quan",
  surface: "Surface weights",
  fairness: "Công bằng & chất lượng",
  ops: "Vận hành & audit"
};

type AlgorithmTabsProps = {
  activeTab: AlgorithmControlTabId;
  disabled?: boolean;
  onChange: (tab: AlgorithmControlTabId) => void;
};

export function AlgorithmTabs({ activeTab, disabled, onChange }: AlgorithmTabsProps) {
  const sections = ["overview", "surface", "fairness", "ops"] as const;

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <label className="mb-1.5 block text-xs font-medium text-zinc-500" htmlFor="algo-tab-select">
          Nhóm cấu hình
        </label>
        <select
          className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2.5 text-sm text-white"
          disabled={disabled}
          id="algo-tab-select"
          onChange={(e) => onChange(e.target.value as AlgorithmControlTabId)}
          value={activeTab}
        >
          {ALGORITHM_CONTROL_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden space-y-5 lg:block">
        {sections.map((section) => {
          const tabs = ALGORITHM_CONTROL_TABS.filter((t) => t.section === section);
          if (tabs.length === 0) return null;
          return (
            <div key={section}>
              <p className="mb-2 text-xs font-medium text-zinc-500">{SECTION_LABELS[section]}</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                          : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/20"
                      }`}
                      disabled={disabled}
                      key={tab.id}
                      onClick={() => onChange(tab.id)}
                      type="button"
                    >
                      <span className="font-semibold">{tab.shortLabel ?? tab.label}</span>
                      {tab.description ? (
                        <span className="mt-0.5 block text-xs text-zinc-500 line-clamp-2">
                          {tab.description}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
