"use client";

import { useState } from "react";
import { FeedbackSheet } from "@/components/me/FeedbackSheet";
import { Card } from "@/components/ui";
import {
  hasVisibleContactChannel,
  isFacebookVisible,
  isFeedbackFormVisible,
  isSupportEmailVisible,
  isTelegramVisible
} from "@/lib/settings/contact-settings-mapper";
import type { ContactSettings } from "@/types/contact-settings";

type ContactFeedbackCardProps = {
  settings: ContactSettings;
  userEmail?: string | null;
};

type ActionItem = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
};

function buildActions(
  settings: ContactSettings,
  onFeedback: () => void
): ActionItem[] {
  const actions: ActionItem[] = [];

  if (isSupportEmailVisible(settings)) {
    actions.push({
      key: "email",
      label: "Email",
      href: `mailto:${encodeURIComponent(settings.supportEmail)}`
    });
  }

  if (isFacebookVisible(settings)) {
    actions.push({
      key: "facebook",
      label: "Fanpage",
      href: settings.facebookUrl
    });
  }

  if (isTelegramVisible(settings)) {
    actions.push({
      key: "telegram",
      label: "Telegram",
      href: settings.telegramUrl
    });
  }

  if (isFeedbackFormVisible(settings)) {
    actions.push({
      key: "feedback",
      label: "Gửi góp ý",
      onClick: onFeedback
    });
  }

  return actions;
}

export function ContactFeedbackCard({
  settings,
  userEmail
}: ContactFeedbackCardProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (!hasVisibleContactChannel(settings)) {
    return null;
  }

  const actions = buildActions(settings, () => setFeedbackOpen(true));

  return (
    <>
      <section className="space-y-2" id="lien-he">
        <h2 className="text-base font-bold text-white">
          {settings.contactTitle}
        </h2>
        <Card className="space-y-3 p-3.5">
          {settings.contactDescription ? (
            <p className="text-sm leading-6 text-zinc-400">
              {settings.contactDescription}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {actions.map((action) =>
              action.href ? (
                <a
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-bold uppercase tracking-[0.1em] text-zinc-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
                  href={action.href}
                  key={action.key}
                  rel={
                    action.key === "facebook" || action.key === "telegram"
                      ? "noopener noreferrer"
                      : undefined
                  }
                  target={
                    action.key === "facebook" || action.key === "telegram"
                      ? "_blank"
                      : undefined
                  }
                >
                  {action.label}
                </a>
              ) : (
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-bold uppercase tracking-[0.1em] text-zinc-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
                  key={action.key}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.label}
                </button>
              )
            )}
          </div>
        </Card>
      </section>

      {feedbackOpen ? (
        <FeedbackSheet
          onClose={() => setFeedbackOpen(false)}
          userEmail={userEmail}
        />
      ) : null}
    </>
  );
}
