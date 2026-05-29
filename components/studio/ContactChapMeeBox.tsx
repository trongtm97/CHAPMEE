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
};

/**
 * Fallback khi admin chưa bật kênh liên hệ.
 * TODO: bổ sung kênh mặc định trong admin Contact Settings thay vì hiển thị placeholder.
 */
const CONTACT_FALLBACK_MESSAGE =
  "ChapMee đang cập nhật kênh liên hệ chính thức. Bạn có thể xem Điều khoản và Chính sách nội dung, hoặc quay lại sau khi admin bật email/fanpage/Telegram.";

export function ContactChapMeeBox({
  settings,
  userEmail
}: ContactChapMeeBoxProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const hasChannels = hasVisibleContactChannel(settings);

  return (
    <section className="scroll-mt-24 space-y-3" id="lien-he-chapmee">
      <div>
        <h2 className="text-lg font-bold text-white">Liên hệ ChapMee</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Kênh hỗ trợ do quản trị viên cấu hình — không cố định trong mã nguồn.
        </p>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-base font-semibold text-white">
            {settings.contactTitle || "Liên hệ ChapMee"}
          </p>
          {settings.contactDescription ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {settings.contactDescription}
            </p>
          ) : null}
        </div>

        {hasChannels ? (
          <div className="flex flex-wrap gap-2">
            {isSupportEmailVisible(settings) ? (
              <a
                className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:border-sky-300/40 hover:text-sky-200"
                href={`mailto:${encodeURIComponent(settings.supportEmail)}`}
              >
                Email: {settings.supportEmail}
              </a>
            ) : null}

            {isFacebookVisible(settings) ? (
              <a
                className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:border-sky-300/40 hover:text-sky-200"
                href={settings.facebookUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Fanpage Facebook
              </a>
            ) : null}

            {isTelegramVisible(settings) ? (
              <a
                className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:border-sky-300/40 hover:text-sky-200"
                href={settings.telegramUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Telegram
              </a>
            ) : null}

            {isFeedbackFormVisible(settings) ? (
              <button
                className="inline-flex min-h-10 items-center rounded-full border border-sky-300/40 bg-sky-300/10 px-4 text-sm font-semibold text-sky-100 transition hover:bg-sky-300/20"
                onClick={() => setFeedbackOpen(true)}
                type="button"
              >
                Gửi góp ý / báo lỗi
              </button>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm leading-6 text-amber-100">
            {CONTACT_FALLBACK_MESSAGE}
          </p>
        )}

        <p className="text-xs text-zinc-500">
          Cần hỗ trợ về kiếm tiền? Xem thêm{" "}
          <Link className="text-sky-300 hover:text-sky-200" href={studioPath("/monetization")}>
            trang Kiếm tiền
          </Link>
          .
        </p>
      </Card>

      {feedbackOpen ? (
        <FeedbackSheet
          onClose={() => setFeedbackOpen(false)}
          userEmail={userEmail}
        />
      ) : null}
    </section>
  );
}
