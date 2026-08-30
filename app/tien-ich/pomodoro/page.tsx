import type { Metadata } from "next";
import { PomodoroTimer } from "@/components/utilities/PomodoroTimer";
import { PomodoroTimerSeoContent } from "@/components/utilities/PomodoroTimerSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/pomodoro",
    pageType: "static",
    fallbackTitle: "Pomodoro Timer — Hẹn Giờ Tập Trung Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Đồng hồ Pomodoro giúp bạn tập trung 25 phút, nghỉ ngắn 5 phút và nghỉ dài 15 phút. Tùy chỉnh thời gian, preset nhanh, chạy trên trình duyệt.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function PomodoroTimerPage() {
  return (
    <UtilitiesToolShell>
      <PomodoroTimer />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <PomodoroTimerSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
