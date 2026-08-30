"use client";

import { useState } from "react";
import { FeedbackSheet } from "@/components/me/FeedbackSheet";
import { Card } from "@/components/ui";
import { isFeedbackFormVisible } from "@/lib/settings/contact-settings-mapper";
import type { ContactSettings } from "@/types/contact-settings";

type MeFeedbackCardProps = {
  settings: ContactSettings;
  userEmail?: string | null;
};

export function MeFeedbackCard({ settings, userEmail }: MeFeedbackCardProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (!isFeedbackFormVisible(settings)) {
    return null;
  }

  return (
    <>
      <section className="space-y-2" id="lien-he">
        <h2 className="text-sm font-bold text-white">Góp ý</h2>
        <Card className="flex items-center justify-between gap-3 p-3.5">
          <p className="text-xs leading-5 text-zinc-500">
            Góp ý giúp ChapMee tốt hơn mỗi ngày.
          </p>
          <button
            className="tap-highlight inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-cyan-300 px-4 text-xs font-bold text-zinc-950 transition hover:bg-cyan-200"
            onClick={() => setFeedbackOpen(true)}
            type="button"
          >
            Gửi góp ý
          </button>
        </Card>
      </section>

      {feedbackOpen ? (
        <FeedbackSheet
          onClose={() => setFeedbackOpen(false)}
          settings={settings}
          userEmail={userEmail}
        />
      ) : null}
    </>
  );
}
