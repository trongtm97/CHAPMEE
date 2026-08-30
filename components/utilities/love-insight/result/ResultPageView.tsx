'use client';

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Container } from '@/components/utilities/love-insight/layout/Container';
import { Card } from '@/components/utilities/love-insight/ui/Card';
import { Disclaimer } from '@/components/utilities/love-insight/ui/Disclaimer';
import { buildShareUrl } from '@/lib/love-insight/api/helpers';
import { cn } from '@/lib/utils/cn';
import type {
  AdviceItem,
  CalculationBreakdownItem,
  InsightItem,
  RiskItem,
  StrengthItem,
} from '@/lib/love-insight/love-engine/explanation';
import type { Subscores } from '@/lib/love-insight/love-engine/types';
import type { LoveReadingResult as SharedResult } from '@/lib/love-insight/shared';

const LOVE_CALCULATOR_PATH = '/tien-ich/boi-tinh-yeu';

// =============================================================================
// Constants
// =============================================================================

type SubscoreKey = keyof Subscores;

const SUBSCORE_ORDER: ReadonlyArray<SubscoreKey> = [
  'emotional',
  'communication',
  'chemistry',
  'stability',
  'conflictRisk',
  'longTerm',
];

const SUBSCORE_LABELS: Record<SubscoreKey, string> = {
  emotional: 'Cảm xúc',
  communication: 'Giao tiếp',
  chemistry: 'Sức hút',
  stability: 'Ổn định',
  conflictRisk: 'Rủi ro xung đột',
  longTerm: 'Tiềm năng lâu dài',
};

const SUBSCORE_EXPLAINERS: Record<SubscoreKey, (score: number) => string> = {
  emotional: (s) =>
    s >= 70
      ? 'Hai bạn khá tinh tế khi chia sẻ và đón nhận cảm xúc thật của nhau.'
      : s >= 40
        ? 'Đã có nền tảng, nhưng cần chủ động mở lòng nhiều hơn mỗi ngày.'
        : 'Cảm xúc chưa thật sự đồng bộ — cần thêm thời gian lắng nghe nhau.',
  communication: (s) =>
    s >= 70
      ? 'Cách hai bạn trò chuyện tạo cảm giác thoải mái, ít khi vướng hiểu lầm.'
      : s >= 40
        ? 'Giao tiếp ổn, nhưng những chủ đề nhạy cảm vẫn cần chọn từ cẩn thận hơn.'
        : 'Dễ hiểu sai ý — thử diễn đạt bằng cảm xúc thay vì phán xét nhau.',
  chemistry: (s) =>
    s >= 70
      ? 'Sức hút tự nhiên khá rõ — hai bạn cuốn hút nhau từ lần gặp đầu tiên.'
      : s >= 40
        ? 'Có sức hút nhất định, sẽ rõ hơn khi cùng nhau tìm hiểu sâu.'
        : 'Sức hút còn nhẹ — điều quan trọng hơn lúc này là sự đồng điệu trong suy nghĩ.',
  stability: (s) =>
    s >= 70
      ? 'Nền tảng quan hệ khá vững — hai bạn có thể dựa vào nhau lúc cần.'
      : s >= 40
        ? 'Nền tảng ở mức vừa, cần xây thêm thói quen và niềm tin mỗi ngày.'
        : 'Mối quan hệ còn mỏng — nên ưu tiên sự ổn định trước khi đi xa hơn.',
  conflictRisk: (s) =>
    s <= 30
      ? 'Rủi ro thấp — hai bạn ít khi để bất đồng leo thành xung đột lớn.'
      : s <= 55
        ? 'Cần chú ý — có những tình huống dễ làm cả hai căng thẳng.'
        : s <= 75
          ? 'Dễ căng thẳng — nên cùng đặt ra "quy tắc cãi vã" rõ ràng.'
          : 'Rủi ro cao — cần đổi cách giao tiếp để tránh tổn thương nhau.',
  longTerm: (s) =>
    s >= 70
      ? 'Tiềm năng dài hạn tốt — có thể đi cùng nhau khá nhiều năm.'
      : s >= 40
        ? 'Có tiềm năng, nhưng cần cùng nhau đặt mục tiêu chung rõ hơn.'
        : 'Tầm nhìn dài hạn chưa rõ — nên có một buổi nói chuyện thật về kỳ vọng tương lai.',
};

const CONFLICT_BANDS: ReadonlyArray<{
  min: number;
  max: number;
  label: string;
  tone: string;
}> = [
  { min: 0, max: 30, label: 'Rủi ro thấp', tone: 'text-emerald-200' },
  { min: 31, max: 55, label: 'Vừa phải', tone: 'text-amber-200' },
  { min: 56, max: 75, label: 'Căng thẳng', tone: 'text-orange-200' },
  { min: 76, max: 100, label: 'Rủi ro cao', tone: 'text-rose-200' },
];

type PrivacyMode = 'FULL_NAMES' | 'INITIALS' | 'HIDDEN';

function detectPrivacyMode(result: SharedResult): PrivacyMode {
  const a = result.displayNames.personA;
  if (a && a.toLowerCase().includes('bí mật')) return 'HIDDEN';
  if (a && a.length <= 2) return 'INITIALS';
  return 'FULL_NAMES';
}

// =============================================================================
// View
// =============================================================================

export interface ResultPageViewProps {
  result: SharedResult;
  /**
   * Ad slots do server page render (WebAdSlot là server component).
   * Client view chỉ nhận React node đã được render sẵn và đặt vào đúng vị trí.
   */
  adTop: ReactNode;
  adMiddle: ReactNode;
  adBottom: ReactNode;
}

export function ResultPageView({
  result,
  adTop,
  adMiddle,
  adBottom,
}: ResultPageViewProps) {
  const privacyMode = detectPrivacyMode(result);
  const shareUrl = result.shareId ? buildShareUrl(result.shareId) : '';

  return (
    <>
      {/* 1. RESULT HERO */}
      <ResultHero result={result} privacyMode={privacyMode} shareUrl={shareUrl} />

      {/* 2. TRUST EXPLANATION */}
      <Container className="pb-10">
        <Card className="border-gold-300/20">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-300/15 text-base text-gold-200"
            >
              ✦
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-display text-xl font-bold text-white sm:text-2xl">
                Vì sao ra được con số này?
              </h2>
              <p className="mt-3 text-base leading-relaxed text-lavender-100">
                {result.trustExplanation}
              </p>
            </div>
          </div>
        </Card>
      </Container>

      {/* 3. AD — web_result_top (sau trust, KHÔNG cạnh CTA) */}
      <Container>{adTop}</Container>

      {/* 4. CALCULATION BREAKDOWN */}
      <Container className="pb-10">
        <SectionHeader
          eyebrow="Các lớp phân tích"
          title="Từng lớp dữ liệu đã được tính"
          description="Mỗi dòng là một lớp phân tích độc lập. Bấm vào để xem vì sao lớp đó ra điểm như vậy."
        />
        <CalculationBreakdownList
          items={result.calculationBreakdown as CalculationBreakdownItem[]}
        />
      </Container>

      {/* 5. SUBSCORE GRID */}
      <Container className="pb-10">
        <SectionHeader
          eyebrow="Sáu chỉ số"
          title="Sáu chỉ số chi tiết của hai bạn"
          description="Mỗi chỉ số đo một khía cạnh riêng. Thanh tiến trình thể hiện mức điểm 0–100."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUBSCORE_ORDER.map((key) => (
            <SubscoreCard
              key={key}
              label={SUBSCORE_LABELS[key]}
              score={result.subscores[key]}
              explainer={SUBSCORE_EXPLAINERS[key](result.subscores[key])}
              lowerIsBetter={key === 'conflictRisk'}
            />
          ))}
        </div>
      </Container>

      {/* 6. AD — web_result_middle */}
      <Container>{adMiddle}</Container>

      {/* 7. PERSONALIZED INSIGHTS */}
      {result.personalizedInsights.length > 0 ? (
        <Container className="pb-10">
          <SectionHeader
            eyebrow="Cá nhân hoá"
            title="Những điều chỉ dành cho hai bạn"
            description="Các insight được viết riêng từ tên, ngày sinh và các lớp dữ liệu đã phân tích."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(result.personalizedInsights as InsightItem[]).map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </Container>
      ) : null}

      {/* 8. STRENGTHS */}
      <Container className="pb-10">
        <SectionHeader
          eyebrow="Nền tốt"
          title="Điểm sáng của kết nối này"
          description="Những gì hai bạn đang có sẵn — cứ phát huy thêm nhé."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(result.strengths as StrengthItem[]).map((item, i) => (
            <TonedCard
              key={i}
              tone="positive"
              title={item.title}
              body={item.text}
              meta={`Dựa trên: ${item.basedOn}`}
              index={i + 1}
            />
          ))}
        </div>
      </Container>

      {/* 9. RISKS */}
      <Container className="pb-10">
        <SectionHeader
          eyebrow="Cần để ý"
          title="Vài chỗ cần để ý"
          description="Những khu vực có thể gây khó khăn — và gợi ý cách xử lý kèm theo."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(result.risks as RiskItem[]).map((item, i) => (
            <RiskCard key={i} item={item} index={i + 1} />
          ))}
        </div>
      </Container>

      {/* 10. ADVICE */}
      <Container className="pb-10">
        <SectionHeader
          eyebrow="Gợi ý cho bạn"
          title="Vài lời khuyên cho hai bạn"
          description="3–5 gợi ý được cá nhân hoá theo giai đoạn quan hệ và các chỉ số."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(result.advice as AdviceItem[]).map((item, i) => (
            <TonedCard
              key={i}
              tone="neutral"
              title={item.title}
              body={item.text}
              meta={`Dựa trên: ${item.basedOn}`}
              index={i + 1}
            />
          ))}
        </div>
      </Container>

      {/* 11. AD — web_result_bottom (cuối báo cáo, TRƯỚC share panel để
          không đặt sát nút share) */}
      <Container>{adBottom}</Container>

      {/* 12. SHARE PANEL */}
      <Container className="pb-12">
        <SharePanel
          result={result}
          privacyMode={privacyMode}
          shareUrl={shareUrl}
        />
      </Container>

      {/* 13. DISCLAIMER */}
      <Container className="pb-20">
        <Disclaimer />
      </Container>
    </>
  );
}

// =============================================================================
// 1. RESULT HERO
// =============================================================================

function ResultHero({
  result,
  privacyMode,
  shareUrl,
}: {
  result: SharedResult;
  privacyMode: PrivacyMode;
  shareUrl: string;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(244, 63, 116, 0.18), transparent 60%), radial-gradient(ellipse at bottom right, rgba(167, 139, 250, 0.18), transparent 55%)',
        }}
      />
      <Container className="py-12 text-center sm:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-300">
          ✦ Bản đọc dành cho hai bạn ✦
        </p>

        <DisplayPair result={result} privacyMode={privacyMode} />

        <div className="mx-auto mt-10 max-w-md">
          <ScoreCircle score={result.totalScore} level={result.levelLabel} />
        </div>

        {result.summary ? (
          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-lavender-100 sm:text-lg">
            {result.summary}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {shareUrl ? (
            <button
              type="button"
              onClick={() => void copyLink()}
              className="btn-primary"
            >
              {copyState === 'copied'
                ? '✓ Đã copy link'
                : copyState === 'error'
                  ? 'Lỗi — copy thủ công'
                  : 'Gửi cho người ấy'}
            </button>
          ) : null}
          <Link
            href={LOVE_CALCULATOR_PATH}
            className="btn-secondary"
          >
            Thử với cặp khác
          </Link>
        </div>
      </Container>
    </section>
  );
}

function DisplayPair({
  result,
  privacyMode,
}: {
  result: SharedResult;
  privacyMode: PrivacyMode;
}) {
  if (privacyMode === 'HIDDEN') {
    return (
      <h1 className="text-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
        Một kết nối bí mật <span className="text-rose-300">❤️</span>
      </h1>
    );
  }
  if (privacyMode === 'INITIALS') {
    return (
      <h1 className="text-display text-4xl font-bold text-white sm:text-5xl md:text-6xl">
        <span className="text-gradient-rose">{result.initials.personA}</span>{' '}
        <span className="text-rose-300">❤️</span>{' '}
        <span className="text-gradient-rose">{result.initials.personB}</span>
      </h1>
    );
  }
  return (
    <h1 className="text-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
      {result.displayNames.personA}{' '}
      <span className="text-rose-300">❤️</span>{' '}
      {result.displayNames.personB}
    </h1>
  );
}

function ScoreCircle({ score, level }: { score: number; level: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 80
      ? 'from-emerald-400 to-emerald-600'
      : clamped >= 60
        ? 'from-rose-400 to-rose-600'
        : clamped >= 40
          ? 'from-amber-400 to-amber-600'
          : 'from-orange-500 to-rose-700';
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'relative flex h-44 w-44 items-center justify-center rounded-full border-4 border-white/20 bg-gradient-to-br shadow-love-glow sm:h-52 sm:w-52',
          color,
        )}
        aria-label={`Tổng điểm ${clamped} trên 100`}
      >
        <div className="absolute inset-2 rounded-full bg-midnight-950/80 backdrop-blur" />
        <div className="relative text-center">
          <p className="text-display text-5xl font-extrabold text-white sm:text-6xl">
            {clamped}
          </p>
          <p className="mt-1 text-xs uppercase tracking-widest text-lavender-200/80">
            / 100
          </p>
        </div>
      </div>
      <p className="text-display mt-5 text-lg font-semibold text-gold-200 sm:text-xl">
        {level}
      </p>
    </div>
  );
}

// =============================================================================
// 4. CALCULATION BREAKDOWN (accordion)
// =============================================================================

function CalculationBreakdownList({
  items,
}: {
  items: CalculationBreakdownItem[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  if (items.length === 0) {
    return (
      <Card>
        <p className="text-sm text-lavender-300">
          Chưa có dữ liệu phân tích chi tiết để hiển thị.
        </p>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const tone =
          item.score >= 80
            ? 'border-emerald-400/30'
            : item.score >= 60
              ? 'border-rose-400/30'
              : item.score >= 40
                ? 'border-amber-400/30'
                : 'border-orange-400/30';
        return (
          <div
            key={`${item.label}-${i}`}
            className={cn(
              'overflow-hidden rounded-2xl border bg-love-card-glass backdrop-blur-md',
              tone,
            )}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
              aria-expanded={isOpen}
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-display text-base font-semibold text-white sm:text-lg">
                  {item.label}
                </h3>
                {item.weight !== undefined ? (
                  <p className="mt-0.5 text-xs text-lavender-300">
                    Đóng góp:{' '}
                    <span className="text-lavender-100">
                      {(item.weight * 100).toFixed(0)}%
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-display text-2xl font-bold sm:text-3xl',
                    item.score >= 80
                      ? 'text-emerald-300'
                      : item.score >= 60
                        ? 'text-rose-300'
                        : item.score >= 40
                          ? 'text-amber-300'
                          : 'text-orange-300',
                  )}
                >
                  {item.score}
                </span>
                <span className="text-xs text-lavender-300">/100</span>
                <span
                  aria-hidden
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-lavender-200 transition-transform',
                    isOpen && 'rotate-180',
                  )}
                >
                  ▾
                </span>
              </div>
            </button>
            {isOpen ? (
              <div className="border-t border-white/10 px-5 py-4 text-sm">
                <p className="leading-relaxed text-lavender-100">
                  {item.why}
                </p>
                {item.rawDisplay ? (
                  <p className="mt-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2 font-mono text-xs text-lavender-200/80">
                    {item.rawDisplay}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// 5. SUBSCORE GRID
// =============================================================================

function SubscoreCard({
  label,
  score,
  explainer,
  lowerIsBetter,
}: {
  label: string;
  score: number;
  explainer: string;
  lowerIsBetter?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const band = lowerIsBetter
    ? clamped <= 30
      ? 'good'
      : clamped <= 55
        ? 'ok'
        : clamped <= 75
          ? 'warn'
          : 'bad'
    : clamped >= 80
      ? 'good'
      : clamped >= 60
        ? 'ok'
        : clamped >= 40
          ? 'warn'
          : 'bad';

  const bandStyle: Record<typeof band, { bar: string; text: string; chip: string }> = {
    good: {
      bar: 'from-emerald-400 to-emerald-600',
      text: 'text-emerald-200',
      chip: 'border-emerald-400/30 bg-emerald-500/10',
    },
    ok: {
      bar: 'from-rose-400 to-rose-600',
      text: 'text-rose-200',
      chip: 'border-rose-400/30 bg-rose-500/10',
    },
    warn: {
      bar: 'from-amber-400 to-amber-600',
      text: 'text-amber-200',
      chip: 'border-amber-400/30 bg-amber-500/10',
    },
    bad: {
      bar: 'from-orange-500 to-rose-700',
      text: 'text-orange-200',
      chip: 'border-orange-400/30 bg-orange-500/10',
    },
  };
  const s = bandStyle[band];

  const conflictNote =
    label === 'Rủi ro xung đột'
      ? CONFLICT_BANDS.find((b) => clamped >= b.min && clamped <= b.max)?.label
      : null;

  return (
    <div className={cn('rounded-2xl border bg-love-card-glass p-5 backdrop-blur-md', s.chip)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className={cn('text-display text-2xl font-bold sm:text-3xl', s.text)}>
          {clamped}
          <span className="ml-1 text-xs font-normal text-lavender-300">/100</span>
        </p>
      </div>
      <ProgressBar
        value={clamped}
        gradientClass={s.bar}
        lowerIsBetter={lowerIsBetter}
      />
      <p className="mt-2 text-xs leading-relaxed text-lavender-200/90">
        {explainer}
      </p>
      {conflictNote ? (
        <p
          className={cn(
            'mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium',
            s.text,
          )}
        >
          {conflictNote}
        </p>
      ) : null}
    </div>
  );
}

function ProgressBar({
  value,
  gradientClass,
  lowerIsBetter,
}: {
  value: number;
  gradientClass: string;
  lowerIsBetter?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r transition-[width] duration-500',
          gradientClass,
          lowerIsBetter && 'opacity-90',
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

// =============================================================================
// 7. INSIGHT CARD
// =============================================================================

function InsightCard({ insight }: { insight: InsightItem }) {
  return (
    <Card className="h-full">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lavender-500/15 text-sm text-lavender-200"
        >
          ✦
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-display text-lg font-semibold text-white">
            {insight.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-lavender-100">
            {insight.text}
          </p>
          <p className="mt-3 text-xs italic text-lavender-300/80">
            Dựa trên: {insight.basedOn}
          </p>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// 8 & 10. STRENGTH / ADVICE CARD
// =============================================================================

function TonedCard({
  tone,
  title,
  body,
  meta,
  index,
}: {
  tone: 'positive' | 'neutral';
  title: string;
  body: string;
  meta?: string;
  index: number;
}) {
  const accent =
    tone === 'positive'
      ? 'border-emerald-400/25 from-emerald-500/10 to-transparent'
      : 'border-lavender-400/25 from-lavender-500/10 to-transparent';
  const badge =
    tone === 'positive'
      ? 'bg-emerald-500/15 text-emerald-200'
      : 'bg-lavender-500/15 text-lavender-200';
  const badgeLabel = tone === 'positive' ? 'Điểm mạnh' : 'Lời khuyên';
  return (
    <div
      className={cn(
        'h-full rounded-2xl border bg-love-card-glass bg-gradient-to-br p-5 backdrop-blur-md',
        accent,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
            badge,
          )}
        >
          {badgeLabel} #{index}
        </span>
      </div>
      <h3 className="text-display mt-3 text-lg font-semibold text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-lavender-100">{body}</p>
      {meta ? (
        <p className="mt-3 text-xs italic text-lavender-300/80">
          Dựa trên: {meta.replace(/^Dựa trên:\s*/, '')}
        </p>
      ) : null}
    </div>
  );
}

// =============================================================================
// 9. RISK CARD
// =============================================================================

function RiskCard({ item, index }: { item: RiskItem; index: number }) {
  return (
    <div className="h-full rounded-2xl border border-rose-400/25 bg-love-card-glass bg-gradient-to-br from-rose-500/10 to-transparent p-5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-200">
          Cần chú ý #{index}
        </span>
      </div>
      <h3 className="text-display mt-3 text-lg font-semibold text-white">
        {item.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-lavender-100">
        {item.text}
      </p>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
          Cách xử lý
        </p>
        <p className="mt-1 text-sm leading-relaxed text-lavender-100">
          {item.howToHandle}
        </p>
      </div>
      <p className="mt-3 text-xs italic text-lavender-300/80">
        Dựa trên: {item.basedOn}
      </p>
    </div>
  );
}

// =============================================================================
// 12. SHARE PANEL
// =============================================================================

type ShareStatus = 'idle' | 'copied' | 'error' | 'downloading' | 'downloaded';

function SharePanel({
  result,
  privacyMode,
  shareUrl,
}: {
  result: SharedResult;
  privacyMode: PrivacyMode;
  shareUrl: string;
}) {
  const [status, setStatus] = useState<ShareStatus>('idle');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const text = useMemo(
    () =>
      buildShareText({
        displayNames: result.displayNames,
        initials: result.initials,
        privacyMode,
        totalScore: result.totalScore,
        levelLabel: result.levelLabel,
        shareUrl,
      }),
    [result, privacyMode, shareUrl],
  );

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  function shareFacebook() {
    if (!shareUrl) return;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function shareZalo() {
    if (!shareUrl) return;
    const url = `https://zalo.me/pc/share?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function downloadImage() {
    setStatus('downloading');
    try {
      const dataUrl = await renderShareImage(canvasRef.current, {
        displayNames: result.displayNames,
        initials: result.initials,
        privacyMode,
        totalScore: result.totalScore,
        levelLabel: result.levelLabel,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `love-insight-${result.shareId ?? 'result'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus('downloaded');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  return (
    <Card>
      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-display text-xl font-bold text-white sm:text-2xl">
            Gửi bản đọc này cho ai đó
          </h2>
          <p className="mt-1 text-sm text-lavender-200">
            Chia sẻ với bạn bè, hoặc lưu lại làm kỷ niệm cho hai bạn.
          </p>
        </div>
        {shareUrl ? (
          <p className="mt-2 break-all rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-lavender-200 sm:mt-0 sm:max-w-md">
            {shareUrl}
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={!shareUrl}
          className="btn-primary !w-full disabled:opacity-50"
        >
          {status === 'copied' ? '✓ Đã copy' : 'Sao chép link'}
        </button>
        <button
          type="button"
          onClick={shareFacebook}
          disabled={!shareUrl}
          className="btn-secondary !w-full disabled:opacity-50"
        >
          Gửi qua Facebook
        </button>
        <button
          type="button"
          onClick={shareZalo}
          disabled={!shareUrl}
          className="btn-secondary !w-full disabled:opacity-50"
        >
          Gửi qua Zalo
        </button>
        <button
          type="button"
          onClick={() => void downloadImage()}
          className="btn-secondary !w-full"
        >
          {status === 'downloading'
            ? 'Đang tạo ảnh…'
            : status === 'downloaded'
              ? '✓ Đã tải ảnh'
              : 'Tải ảnh về máy'}
        </button>
        <Link
          href={LOVE_CALCULATOR_PATH}
          className="btn-secondary !w-full"
        >
          Thử với cặp khác
        </Link>
      </div>

      {status === 'error' ? (
        <p className="mt-3 text-xs text-rose-200">
          Có lỗi nhỏ xảy ra — bạn có thể tự sao chép link ở trên nhé.
        </p>
      ) : null}

      <p className="mt-5 whitespace-pre-line rounded-xl border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-lavender-100">
        {text}
      </p>

      <canvas
        ref={canvasRef}
        width={1080}
        height={1080}
        aria-hidden
        className="hidden"
      />
    </Card>
  );
}

// =============================================================================
// Helpers (canvas + share text)
// =============================================================================

function buildShareText(params: {
  displayNames: SharedResult['displayNames'];
  initials: SharedResult['initials'];
  privacyMode: PrivacyMode;
  totalScore: number;
  levelLabel: string;
  shareUrl: string;
}): string {
  const { displayNames, initials, privacyMode, totalScore, levelLabel, shareUrl } = params;
  const a =
    privacyMode === 'HIDDEN'
      ? 'Một kết nối bí mật'
      : privacyMode === 'INITIALS'
        ? initials.personA
        : displayNames.personA;
  const b =
    privacyMode === 'HIDDEN'
      ? ''
      : privacyMode === 'INITIALS'
        ? initials.personB
        : displayNames.personB;
  const head = b ? `${a} ❤️ ${b}` : a;
  return [
    `${head} — ${totalScore}/100 (${levelLabel})`,
    'Đọc vị tình yêu qua tên & ngày sinh.',
    shareUrl,
  ].join('\n');
}

async function renderShareImage(
  canvas: HTMLCanvasElement | null,
  params: {
    displayNames: SharedResult['displayNames'];
    initials: SharedResult['initials'];
    privacyMode: PrivacyMode;
    totalScore: number;
    levelLabel: string;
  },
): Promise<string> {
  if (!canvas) throw new Error('Canvas not ready');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');

  const W = canvas.width;
  const H = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0e0526');
  bg.addColorStop(0.5, '#1a0b3d');
  bg.addColorStop(1, '#2c1a5c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow1 = ctx.createRadialGradient(W * 0.2, H * 0.15, 0, W * 0.2, H * 0.15, W * 0.5);
  glow1.addColorStop(0, 'rgba(167, 139, 250, 0.4)');
  glow1.addColorStop(1, 'rgba(167, 139, 250, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.85, H * 0.85, 0, W * 0.85, H * 0.85, W * 0.5);
  glow2.addColorStop(0, 'rgba(244, 63, 116, 0.35)');
  glow2.addColorStop(1, 'rgba(244, 63, 116, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fcd34d';
  ctx.font = '500 28px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('✦  ChapMee Bói Tình Yêu  ✦', W / 2, 160);

  const { displayNames, initials, privacyMode, totalScore, levelLabel } = params;
  const a =
    privacyMode === 'HIDDEN'
      ? 'Một kết nối bí mật'
      : privacyMode === 'INITIALS'
        ? initials.personA
        : displayNames.personA;
  const b =
    privacyMode === 'HIDDEN'
      ? ''
      : privacyMode === 'INITIALS'
        ? initials.personB
        : displayNames.personB;

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 96px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(a, W / 2, 320);

  if (b) {
    ctx.fillStyle = '#fb7299';
    ctx.font = '700 80px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('❤️', W / 2, 420);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 96px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(b, W / 2, 540);
  }

  const cx = W / 2;
  const cy = 760;
  const r = 170;

  const scoreColor =
    totalScore >= 80
      ? '#10b981'
      : totalScore >= 60
        ? '#f43f74'
        : totalScore >= 40
          ? '#f59e0b'
          : '#f97316';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = scoreColor;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 130px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(String(totalScore), cx, cy + 20);
  ctx.font = '500 28px "Inter", system-ui, sans-serif';
  ctx.fillStyle = '#cdbcec';
  ctx.fillText('/ 100', cx, cy + 80);

  ctx.fillStyle = '#fde68a';
  ctx.font = '600 36px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(levelLabel, cx, cy + 240);

  ctx.fillStyle = 'rgba(205, 188, 236, 0.7)';
  ctx.font = '500 22px "Inter", system-ui, sans-serif';
  ctx.fillText('Đọc vị tình yêu qua tên & ngày sinh', cx, H - 80);

  return canvas.toDataURL('image/png');
}

// =============================================================================
// SectionHeader
// =============================================================================

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold-300">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-display text-xl font-bold text-white sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-lavender-200/90">{description}</p>
      ) : null}
    </div>
  );
}
