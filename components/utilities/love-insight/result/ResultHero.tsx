import Link from 'next/link';
import { Container } from '@/components/layout/Container';

interface ResultHeroProps {
  displayPair: string;
  totalScore: number;
  levelLabel: string;
  summary: string;
  onShare: () => void;
  shareCopied: boolean;
}

/**
 * Hero đầu trang kết quả — displayPair + score circle lớn + level + summary
 * + 2 CTA: Copy link chia sẻ + Tạo kết quả mới.
 */
export function ResultHero({
  displayPair,
  totalScore,
  levelLabel,
  summary,
  onShare,
  shareCopied,
}: ResultHeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background stars */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 60% 70%, white, transparent), radial-gradient(1px 1px at 80% 20%, white, transparent), radial-gradient(1px 1px at 30% 80%, white, transparent), radial-gradient(1px 1px at 90% 50%, white, transparent)',
        }}
      />
      <Container className="py-12 text-center sm:py-16">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold-300">
          ✦ Kết quả ✦
        </p>
        <h1 className="text-display mx-auto max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
          {displayPair}
        </h1>

        <ScoreCircle score={totalScore} levelLabel={levelLabel} />

        <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-lavender-200 sm:text-lg">
          {summary}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onShare}
            className="btn-primary"
          >
            {shareCopied ? '✓ Đã copy link' : '🔗 Chia sẻ kết quả'}
          </button>
          <Link href="/love-calculator" className="btn-secondary">
            ✨ Tạo kết quả mới
          </Link>
        </div>
      </Container>
    </section>
  );
}

function ScoreCircle({ score, levelLabel }: { score: number; levelLabel: string }) {
  return (
    <div className="mx-auto mt-8 flex max-w-md flex-col items-center">
      <div
        className="relative flex h-44 w-44 items-center justify-center rounded-full border-4 border-rose-400 bg-rose-500/10 shadow-glow sm:h-52 sm:w-52"
        aria-label={`Tổng điểm ${score} trên 100`}
      >
        {/* Decorative ring */}
        <div
          aria-hidden
          className="absolute inset-2 rounded-full border-2 border-rose-300/30"
        />
        <div className="text-center">
          <span className="text-display block text-5xl font-extrabold text-white sm:text-6xl">
            {score}
          </span>
          <span className="text-xs uppercase tracking-wider text-lavender-300/80">
            / 100
          </span>
        </div>
      </div>
      <p className="text-display mt-5 text-lg font-semibold text-gold-200 sm:text-xl">
        {levelLabel}
      </p>
    </div>
  );
}