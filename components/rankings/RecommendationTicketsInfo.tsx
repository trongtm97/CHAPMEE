import Link from "next/link";
import {
  getRecommendationTicketsConfig,
  RECOMMENDATION_TICKETS_CONFIG
} from "@/lib/recommendations/config";

type RecommendationTicketsInfoProps = {
  variant?: "card" | "inline";
  showTopupLink?: boolean;
};

export function RecommendationTicketsInfo({
  variant = "card",
  showTopupLink = true
}: RecommendationTicketsInfoProps) {
  const config = getRecommendationTicketsConfig();
  if (!config.showPublicExplanation) {
    return null;
  }

  const { ticketsPerPaidCoin, storyMilestoneChapterCount, ticketsPerStoryMilestone } =
    RECOMMENDATION_TICKETS_CONFIG;

  const items = [
    config.enableTopupBonusTickets
      ? `Nạp Xu: mỗi 1 Xu nạp thành công được tặng ${ticketsPerPaidCoin} Phiếu đề cử.`
      : null,
    config.enableChapterCompletionTickets
      ? `Đọc truyện: hoàn thành chương hợp lệ nhận ${config.ticketsPerCompletedChapter} Phiếu đề cử (một lần/chương).`
      : null,
    config.enableStoryReadingMilestoneTickets
      ? `Mốc đọc: đủ ${storyMilestoneChapterCount} chương trong cùng truyện nhận thêm ${ticketsPerStoryMilestone} Phiếu đề cử.`
      : null,
    config.enableCommentTickets
      ? `Bình luận truyện hợp lệ: +${config.ticketsPerValidComment} Phiếu đề cử (một lần/bình luận, không tính spam).`
      : null,
    config.enableDailyActivityTickets
      ? `Hoạt động hằng ngày: +${config.ticketsPerDailyActivity} Phiếu đề cử/ngày khi đăng nhập, đọc, bình luận hoặc nạp Xu.`
      : null,
    "Sự kiện ChapMee: admin có thể tặng thêm Phiếu đề cử qua sự kiện."
  ].filter((line): line is string => Boolean(line));

  const wrapperClass =
    variant === "card"
      ? "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
      : "space-y-3";

  return (
    <section className={wrapperClass}>
      <h2 className="text-sm font-bold text-zinc-100">Lấy Phiếu đề cử bằng cách nào?</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Bạn có thể nhận Phiếu đề cử từ nhiều hoạt động trên ChapMee.
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-zinc-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        Phiếu đề cử dùng để ủng hộ truyện bạn yêu thích trên bảng xếp hạng Được đề cử. Phiếu đề cử
        không phải Xu, không thể rút, không quy đổi thành tiền và không dùng để mua chương truyện.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {showTopupLink ? (
          <Link className="font-semibold text-amber-300 hover:text-amber-200" href="/coin/checkout">
            Nạp Xu
          </Link>
        ) : null}
        <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/truyen">
          Khám phá truyện
        </Link>
        <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/reels">
          Lướt Reels
        </Link>
      </div>
    </section>
  );
}
