import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import type { StudioTemplateTab } from "@/types/templates";

const TABS: Array<{ label: string; value: StudioTemplateTab }> = [
  { label: "Mẫu của ChapMee", value: "system" },
  { label: "Mẫu của tôi", value: "mine" },
  { label: "Yêu thích", value: "favorites" },
  { label: "Gần đây", value: "recent" }
];

type TemplateTabsProps = {
  activeTab: StudioTemplateTab;
  basePath: string;
  counts: Record<StudioTemplateTab, number>;
  query: Record<string, string | undefined>;
};

export function TemplateTabs({
  activeTab,
  basePath,
  counts,
  query
}: TemplateTabsProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <Link
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
              href={buildStudioManagerHref(basePath, {
                ...query,
                tab: tab.value === "system" ? undefined : tab.value
              })}
              key={tab.value}
            >
              {tab.label} ({counts[tab.value]})
            </Link>
          );
        })}
      </div>
    </div>
  );
}
