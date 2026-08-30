import type { Subscores } from '@/lib/love-engine/types';

interface SubscoreGridProps {
  subscores: Subscores;
}

const SUBSCORE_LABELS: Record<keyof Subscores, string> = {
  emotional: 'Cảm xúc',
  communication: 'Giao tiếp',
  chemistry: 'Sức hút',
  stability: 'Ổn định',
  conflictRisk: 'Rủi ro xung đột',
  longTerm: 'Tiềm năng lâu dài',
};

const ORDER: ReadonlyArray<keyof Subscores> = [
  'emotional',
  'communication',
  'chemistry',
  'stability',
  'conflictRisk',
  'longTerm',
];

interface BandInfo {
  label: string;
  tone: 'good' | 'mid' | 'bad';
  explanation: string;
}

const BAND_EXPLAIN: Record<keyof Subscores, (score: number) => BandInfo> = {
  emotional: (s) => {
    if (s >= 76) return { label: 'Đồng điệu', tone: 'good', explanation: 'Cảm xúc hai bên khá đồng điệu, dễ thấu hiểu nhau trong những tình huống nhạy cảm.' };
    if (s >= 56) return { label: 'Khá tốt', tone: 'good', explanation: 'Hai bạn có nền tảng cảm xúc khá — tiếp tục chia sẻ để gắn kết hơn.' };
    if (s >= 31) return { label: 'Cần chú ý', tone: 'mid', explanation: 'Cảm xúc chưa đồng bộ — cần thêm thời gian lắng nghe và chia sẻ thật lòng.' };
    return { label: 'Còn xa', tone: 'bad', explanation: 'Hai bạn đang nói hai ngôn ngữ cảm xúc khác nhau — cần chậm lại và lắng nghe.' };
  },
  communication: (s) => {
    if (s >= 76) return { label: 'Rất ăn ý', tone: 'good', explanation: 'Cách hai bạn diễn đạt khá ăn ý, ít khi hiểu lầm.' };
    if (s >= 56) return { label: 'Khá tốt', tone: 'good', explanation: 'Giao tiếp ổn — vẫn có thể cải thiện thêm ở những chủ đề nhạy cảm.' };
    if (s >= 31) return { label: 'Cần cải thiện', tone: 'mid', explanation: 'Giao tiếp cần cải thiện — thử nói chậm lại và lắng nghe chủ động hơn.' };
    return { label: 'Dễ hiểu lầm', tone: 'bad', explanation: 'Có nhiều hiểu lầm tiềm ẩn — cần học cách nói "cảm xúc" thay vì chỉ "sự kiện".' };
  },
  chemistry: (s) => {
    if (s >= 76) return { label: 'Rất bắt', tone: 'good', explanation: 'Sức hút tự nhiên giữa hai bạn khá rõ ràng.' };
    if (s >= 56) return { label: 'Có duyên', tone: 'good', explanation: 'Có sức hút tự nhiên — tiếp tục xây dựng qua trải nghiệm chung.' };
    if (s >= 31) return { label: 'Chưa rõ', tone: 'mid', explanation: 'Sức hút chưa rõ — cần thêm thời gian và hoạt động chung để tăng kết nối.' };
    return { label: 'Còn thấp', tone: 'bad', explanation: 'Sức hút còn thấp — có thể do ít cơ hội gặp gỡ hoặc khác biệt sở thích lớn.' };
  },
  stability: (s) => {
    if (s >= 76) return { label: 'Vững vàng', tone: 'good', explanation: 'Nền tảng mối quan hệ khá vững, có thể chịu được thử thách nhỏ.' };
    if (s >= 56) return { label: 'Khá ổn', tone: 'good', explanation: 'Mối quan hệ có nền tảng — cần tiếp tục xây dựng thói quen chung.' };
    if (s >= 31) return { label: 'Cần xây thêm', tone: 'mid', explanation: 'Nền tảng cần xây thêm — tập trung thói quen và cam kết nhỏ mỗi ngày.' };
    return { label: 'Rất mỏng', tone: 'bad', explanation: 'Mối quan hệ chưa có nền tảng rõ ràng — cần thêm thời gian xây dựng sự tin tưởng.' };
  },
  conflictRisk: (s) => {
    if (s >= 76) return { label: 'Rủi ro cao', tone: 'bad', explanation: 'Rủi ro xung đột cao — nên tránh im lặng kéo dài và dùng thử lòng.' };
    if (s >= 56) return { label: 'Dễ căng thẳng', tone: 'bad', explanation: 'Dễ căng thẳng khi có bất đồng — đặt ra quy tắc giao tiếp rõ ràng trước.' };
    if (s >= 31) return { label: 'Cần chú ý', tone: 'mid', explanation: 'Rủi ro ở mức vừa — chọn thời điểm nói chuyện khi bình tĩnh.' };
    return { label: 'Rủi ro thấp', tone: 'good', explanation: 'Hai bạn có khả năng hoà giải tốt khi có bất đồng.' };
  },
  longTerm: (s) => {
    if (s >= 76) return { label: 'Rất triển vọng', tone: 'good', explanation: 'Tiềm năng dài hạn rất tốt nếu cả hai tiếp tục đầu tư.' };
    if (s >= 56) return { label: 'Có triển vọng', tone: 'good', explanation: 'Có cơ sở để phát triển dài hạn — cần ý thức xây dựng liên tục.' };
    if (s >= 31) return { label: 'Cần thời gian', tone: 'mid', explanation: 'Tầm nhìn dài hạn cần được trò chuyện cởi mở giữa hai bên.' };
    return { label: 'Chưa rõ', tone: 'bad', explanation: 'Khó đánh giá dài hạn — cần thêm trải nghiệm thực tế để xác nhận.' };
  },
};

const TONE_CLASS: Record<BandInfo['tone'], { bar: string; text: string }> = {
  good: { bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500', text: 'text-emerald-200' },
  mid: { bar: 'bg-gradient-to-r from-amber-300 to-amber-500', text: 'text-amber-200' },
  bad: { bar: 'bg-gradient-to-r from-rose-400 to-rose-600', text: 'text-rose-200' },
};

export function SubscoreGrid({ subscores }: SubscoreGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ORDER.map((key) => (
        <SubscoreCard
          key={key}
          label={SUBSCORE_LABELS[key]}
          score={subscores[key]}
          info={BAND_EXPLAIN[key](subscores[key])}
        />
      ))}
    </div>
  );
}

function SubscoreCard({
  label,
  score,
  info,
}: {
  label: string;
  score: number;
  info: BandInfo;
}) {
  const tone = TONE_CLASS[info.tone];
  return (
    <div className="rounded-2xl border border-white/10 bg-card-glass p-4 shadow-card backdrop-blur-md">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-lavender-200">{label}</p>
        <p className={`text-display text-2xl font-bold ${tone.text}`}>{score}</p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full ${tone.bar} transition-all`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide text-lavender-300/80">
          {info.label}
        </span>
        <span className="text-lavender-400/60">/ 100</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-lavender-200/90">
        {info.explanation}
      </p>
    </div>
  );
}