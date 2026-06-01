import Link from "next/link";
import type {
  StudioChapterManagerStats,
  StudioStoryHeader
} from "@/lib/studio/get-studio-chapters";
import { studioPath } from "@/lib/studio/constants";

type ChapterManagerAlertsProps = {
  stats: StudioChapterManagerStats | null;
  story: StudioStoryHeader;
  storyId: string;
};

export function ChapterManagerAlerts({
  stats,
  story,
  storyId
}: ChapterManagerAlertsProps) {
  if (!stats) {
    return null;
  }

  const alerts: Array<{ id: string; tone: "info" | "warning" | "danger"; message: string; href?: string; label?: string }> = [];

  if (stats.totalChapters === 0) {
    alerts.push({
      id: "empty",
      message: "Truyện chưa có chương nào. Hãy viết chương đầu hoặc nhập hàng loạt để bắt đầu.",
      tone: "info"
    });
  }

  if (stats.draftCount > 0) {
    alerts.push({
      id: "drafts",
      message: `Bạn có ${stats.draftCount} chương nháp chưa đăng.`,
      tone: "info"
    });
  }

  if (stats.incompleteSeoCount > 0) {
    alerts.push({
      id: "seo",
      message: `${stats.incompleteSeoCount} chương cần hoàn thiện SEO cơ bản.`,
      tone: "warning"
    });
  }

  if (stats.invalidComposerCount > 0) {
    alerts.push({
      id: "composer",
      message: `${stats.invalidComposerCount} chương Composer cần kiểm tra trước khi đăng.`,
      tone: "warning"
    });
  }

  if (stats.orderDiagnostics.hasIssues) {
    alerts.push({
      href: `${studioPath(`/stories/${storyId}/chapters`)}?reorder=1`,
      id: "order",
      label: "Kiểm tra thứ tự",
      message: "Phát hiện số chương trùng hoặc thiếu trong dãy số.",
      tone: "danger"
    });
  }

  if (story.isCompleted && (stats.draftCount > 0 || stats.scheduledCount > 0)) {
    alerts.push({
      id: "completed-draft",
      message: "Truyện đã hoàn thành nhưng vẫn còn chương nháp hoặc lên lịch.",
      tone: "warning"
    });
  }

  if (story.monetizationEnabled && stats.totalChapters > 0) {
    alerts.push({
      href: studioPath(`/monetization?story=${storyId}`),
      id: "monetization",
      label: "Mở Kiếm tiền",
      message: "Truyện đang bật kiếm tiền — kiểm tra giá chương trả phí.",
      tone: "info"
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  const toneClass = {
    danger: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    info: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
    warning: "border-amber-400/30 bg-amber-500/10 text-amber-100"
  };

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Tình trạng xuất bản
      </h2>
      <div className="space-y-2">
        {alerts.slice(0, 4).map((alert) => (
          <div
            className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between ${toneClass[alert.tone]}`}
            key={alert.id}
          >
            <p>{alert.message}</p>
            {alert.href && alert.label ? (
              <Link
                className="shrink-0 text-sm font-semibold underline-offset-2 hover:underline"
                href={alert.href}
              >
                {alert.label}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
