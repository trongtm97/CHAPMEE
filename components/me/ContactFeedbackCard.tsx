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
  icon: React.ReactNode;
};

function EmailIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function FeedbackIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  );
}

function buildActions(
  settings: ContactSettings,
  onFeedback: () => void
): ActionItem[] {
  const actions: ActionItem[] = [];

  if (isSupportEmailVisible(settings)) {
    actions.push({
      key: "email",
      label: settings.emailLabel || "Gửi email",
      href: `mailto:${encodeURIComponent(settings.supportEmail)}`,
      icon: <EmailIcon />
    });
  }

  if (isFacebookVisible(settings)) {
    actions.push({
      key: "facebook",
      label: settings.fanpageLabel || "Fanpage",
      href: settings.facebookUrl,
      icon: <FacebookIcon />
    });
  }

  if (isTelegramVisible(settings)) {
    actions.push({
      key: "telegram",
      label: settings.telegramLabel || "Telegram",
      href: settings.telegramUrl,
      icon: <TelegramIcon />
    });
  }

  if (isFeedbackFormVisible(settings)) {
    actions.push({
      key: "feedback",
      label: "Gửi góp ý",
      onClick: onFeedback,
      icon: <FeedbackIcon />
    });
  }

  return actions;
}

async function handleEmailClick(email: string, event: React.MouseEvent<HTMLAnchorElement>) {
  if (typeof navigator !== "undefined" && !navigator.userAgent.includes("Mobile")) {
    return;
  }

  event.preventDefault();
  try {
    window.location.href = `mailto:${encodeURIComponent(email)}`;
  } catch {
    try {
      await navigator.clipboard.writeText(email);
      window.alert("Đã sao chép email hỗ trợ vào clipboard.");
    } catch {
      window.prompt("Sao chép email hỗ trợ:", email);
    }
  }
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
        <h2 className="text-base font-bold text-white">{settings.contactTitle}</h2>
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
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-bold text-zinc-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
                  href={action.href}
                  key={action.key}
                  onClick={
                    action.key === "email"
                      ? (event) => handleEmailClick(settings.supportEmail, event)
                      : undefined
                  }
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
                  {action.icon}
                  {action.label}
                </a>
              ) : (
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-bold text-zinc-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
                  key={action.key}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.icon}
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
          settings={settings}
          userEmail={userEmail}
        />
      ) : null}
    </>
  );
}
