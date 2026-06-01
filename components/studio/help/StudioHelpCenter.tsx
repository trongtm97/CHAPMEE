"use client";

import { useMemo, useState } from "react";
import { ContactChapMeeBox } from "@/components/studio/ContactChapMeeBox";
import { FAQAccordion } from "@/components/studio/FAQAccordion";
import { HelpActionGrid } from "@/components/studio/help/HelpActionGrid";
import { HelpGuideModuleCard } from "@/components/studio/help/HelpGuideModuleCard";
import { HelpHero } from "@/components/studio/help/HelpHero";
import { HelpOnboardingPath } from "@/components/studio/help/HelpOnboardingPath";
import { HelpQuickNav } from "@/components/studio/help/HelpQuickNav";
import { HelpSearchBar } from "@/components/studio/help/HelpSearchBar";
import { HelpSidebar } from "@/components/studio/help/HelpSidebar";
import { Button } from "@/components/ui";
import {
  STUDIO_HELP_ACTION_CARDS,
  STUDIO_HELP_GUIDE_MODULES,
  STUDIO_HELP_ONBOARDING_STEPS,
  STUDIO_HELP_QUICK_NAV,
  filterActionCards,
  filterFaqItems,
  filterGuideModules
} from "@/lib/content/studio-help";
import type { StudioHelpPageData } from "@/lib/studio/get-studio-help-page-data";

type StudioHelpCenterProps = StudioHelpPageData & {
  userEmail?: string | null;
};

export function StudioHelpCenter({ contact, faq, userEmail }: StudioHelpCenterProps) {
  const [search, setSearch] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const filteredModules = useMemo(
    () => filterGuideModules(STUDIO_HELP_GUIDE_MODULES, search),
    [search]
  );
  const filteredActions = useMemo(
    () => filterActionCards(STUDIO_HELP_ACTION_CARDS, search),
    [search]
  );
  const filteredFaq = useMemo(() => filterFaqItems(faq, search), [faq, search]);

  const resultCount = filteredModules.length + filteredFaq.length + filteredActions.length;
  const hasSearch = search.trim().length > 0;
  const noResults = hasSearch && resultCount === 0;

  function openFeedback() {
    setFeedbackOpen(true);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <HelpHero onFeedbackClick={openFeedback} />

      <HelpSearchBar
        onChange={setSearch}
        onClear={() => setSearch("")}
        resultCount={hasSearch ? resultCount : undefined}
        value={search}
      />

      {noResults ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
          <p className="text-sm text-zinc-400">
            Không tìm thấy nội dung phù hợp. Thử từ khóa khác hoặc gửi góp ý cho ChapMee.
          </p>
          <Button className="mt-4 min-h-10" onClick={openFeedback} type="button" variant="secondary">
            Gửi góp ý / báo lỗi
          </Button>
        </div>
      ) : (
        <>
          {!hasSearch ? <HelpQuickNav items={STUDIO_HELP_QUICK_NAV} /> : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
            <div className="min-w-0 space-y-8">
              <div className="lg:hidden">
                <HelpActionGrid cards={filteredActions} />
              </div>

              {!hasSearch ? <HelpOnboardingPath steps={STUDIO_HELP_ONBOARDING_STEPS} /> : null}

              {filteredModules.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-lg font-bold text-white">Hướng dẫn theo module</h2>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {filteredModules.map((module) => (
                      <HelpGuideModuleCard key={module.id} module={module} />
                    ))}
                  </div>
                </section>
              ) : null}

              {filteredFaq.length > 0 ? (
                <FAQAccordion externalQuery={search} items={filteredFaq} />
              ) : null}

              <ContactChapMeeBox
                feedbackOpen={feedbackOpen}
                onFeedbackOpenChange={setFeedbackOpen}
                settings={contact}
                userEmail={userEmail}
              />
            </div>

            <div className="hidden lg:block">
              <HelpSidebar actionCards={filteredActions} onFeedbackClick={openFeedback} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
