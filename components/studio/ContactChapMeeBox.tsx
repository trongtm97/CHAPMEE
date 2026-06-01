"use client";

import { useState } from "react";
import Link from "next/link";
import { FeedbackSheet } from "@/components/me/FeedbackSheet";
import { Card } from "@/components/ui";
import { studioPath } from "@/lib/studio/constants";
import {
  hasVisibleContactChannel,
  isFacebookVisible,
  isFeedbackFormVisible,
  isSupportEmailVisible,
  isTelegramVisible
} from "@/lib/settings/contact-settings-mapper";
import type { ContactSettings } from "@/types/contact-settings";

type ContactChapMeeBoxProps = {
  settings: ContactSettings;
  userEmail?: string | null;
  feedbackOpen?: boolean;
  onFeedbackOpenChange?: (open: boolean) => void;
};

const CONTACT_FALLBACK_MESSAGE =
  "ChapMee đang cập nhật kênh liên hệ chính thức. Bạn có thể gửi góp ý / báo lỗi hoặc xem Chính sách nội dung.";

export function ContactChapMeeBox({
  feedbackOpen: controlledOpen,
  onFeedbackOpenChange,
  settings,
  userEmail
}: ContactChapMeeBoxProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const feedbackOpen = controlledOpen ?? internalOpen;
  const setFeedbackOpen = onFeedbackOpenChange ?? setInternalOpen;
  const hasChannels = hasVisibleContactChannel(settings);
  const showFeedbackButton = isFeedbackFormVisible(settings) || !hasChannels;

  return (
    <section className="scroll-mt-24 space-y-3" id="lien-he-chapmee">
      <div>
        <h2 className="text-lg font-bold text-white">Cần hỗ trợ thêm?</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Liên hệ ChapMee qua các kênh được cấu hình hoặc gửi góp ý trực tiếp.
        </p>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-base font-semibold text-white">
            {settings.contactTitle || "Liên hệ ChapMee"}
          </p>
          {settings.contactDescription ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">{settings.contactDescription}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {showFeedbackButton ? (
            <button
              className="inline-flex min-h-10 items-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              onClick={() => setFeedbackOpen(true)}
              type="button"
            >
              Gửi góp ý / báo lỗi
            </button>
          ) : null}

          {isSupportEmailVisible(settings) ? (
            <a
              className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/40 hover:text-cyan-100"
              href={`mailto:${encodeURIComponent(settings.supportEmail)}`}
            >
              {settings.emailLabel || "Email"}
            </a>
          ) : null}

          {isFacebookVisible(settings) ? (
            <a
              className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/40 hover:text-cyan-100"
              href={settings.facebookUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {settings.fanpageLabel || "Fanpage"}
            </a>
          ) : null}

          {isTelegramVisible(settings) ? (
            <a
              className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/40 hover:text-cyan-100"
              href={settings.telegramUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {settings.telegramLabel || "Telegram"}
            </a>
          ) : null}
        </div>

        {!hasChannels && !showFeedbackButton ? (
          <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm leading-6 text-amber-100">
            {CONTACT_FALLBACK_MESSAGE}
          </p>
        ) : null}

        <p className="text-xs text-zinc-500">
          Cần hỗ trợ về kiếm tiền? Xem thêm{" "}
          <Link className="text-cyan-300 hover:text-cyan-200" href={studioPath("/monetization")}>
            trang Kiếm tiền
          </Link>
          .
        </p>
      </Card>

      {feedbackOpen ? (
        <FeedbackSheet
          onClose={() => setFeedbackOpen(false)}
          settings={settings}
          userEmail={userEmail}
        />
      ) : null}
    </section>
  );
}
